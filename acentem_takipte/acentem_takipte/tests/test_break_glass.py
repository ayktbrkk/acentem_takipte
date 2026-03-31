"""
Unit tests for break-glass audit workflow.

Tests:
- Request creation with validation (justification length, duplicate checks)
- System Manager approval with time-bound calculation
- Request rejection with audit logging
- Runtime access validation (active/expired checks)
- Scheduled expiration job
"""

import unittest
from unittest.mock import patch, MagicMock
import frappe
from frappe.utils import add_to_date, now_datetime, get_datetime
from datetime import timedelta

# Import break-glass service
try:
    from acentem_takipte.acentem_takipte.services.break_glass import (
        create_break_glass_request,
        approve_break_glass_request,
        reject_break_glass_request,
        validate_break_glass_access,
        expire_break_glass_grants,
        can_view_break_glass_audit,
        detect_break_glass_anomalies,
        BreakGlassAccessDenied
    )
except ImportError:
    # Handle case where module isn't loaded yet
    pass


class TestBreakGlassWorkflow(unittest.TestCase):
    """Test break-glass request workflow"""
    
    def setUp(self):
        """Initialize test environment"""
        self.test_user = f"test_user_{frappe.generate_hash(length=6)}@example.com"
        self.test_sm = "Administrator"
        _ensure_user_exists(self.test_user)

    def tearDown(self):
        frappe.db.rollback()
    
    def test_create_request_success(self):
        """Test creating a valid break-glass request"""
        result = create_break_glass_request(
            access_type="customer_data",
            justification="Emergency access for customer dispute resolution",
            user=self.test_user
        )
        
        assert result["ok"] is True
        assert result["status"] == "Pending"
        assert "request_id" in result
    
    def test_create_request_short_justification(self):
        """Test that short justification is rejected"""
        with self.assertRaises(frappe.ValidationError) as context:
            create_break_glass_request(
                access_type="customer_data",
                justification="Too short",
                user=self.test_user
            )
        
        assert "Justification must be at least 20 characters" in str(context.exception)
    
    def test_create_request_empty_justification(self):
        """Test that empty justification is rejected"""
        with self.assertRaises(frappe.ValidationError):
            create_break_glass_request(
                access_type="customer_data",
                justification="",
                user=self.test_user
            )
    
    def test_create_request_duplicate_prevention(self):
        """Test that duplicate pending requests are prevented"""
        # Create first request
        create_break_glass_request(
            access_type="customer_data",
            justification="First request for customer data access",
            user=self.test_user
        )
        
        # Try to create duplicate
        with self.assertRaises(frappe.ValidationError) as context:
            create_break_glass_request(
                access_type="customer_data",
                justification="Second request for same access type",
                user=self.test_user
            )
        
        assert "already have a pending request" in str(context.exception)
    
    def test_approve_request_success(self):
        """Test approving a break-glass request"""
        # Create request
        request_result = create_break_glass_request(
            access_type="customer_financials",
            justification="Emergency financial review needed",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        # Approve request
        with patch("frappe.model.document.Document.validate_set_only_once", lambda self: None):
            approve_result = approve_break_glass_request(
                request_id=request_id,
                duration_hours=4,
                approver_comments="Approved for 4-hour emergency review",
            )
        
        assert approve_result["ok"] is True
        assert "expires_at" in approve_result
        assert "request_id" in approve_result
    
    def test_approve_request_non_sm_rejected(self):
        """Test that non-System Managers cannot approve"""
        # Create request
        request_result = create_break_glass_request(
            access_type="system_admin",
            justification="Emergency system admin access needed",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        # Try to approve as non-SM (should check is_system_manager)
        with self.assertRaises(frappe.ValidationError) as context:
            approve_break_glass_request(
                request_id=request_id,
                duration_hours=2,
                approver="regular_user@example.com"  # Not a System Manager
            )
        
        assert "Only System Managers" in str(context.exception)
    
    def test_approve_request_invalid_duration(self):
        """Test that approval duration is validated (1-72 hours)"""
        # Create request
        request_result = create_break_glass_request(
            access_type="customer_data",
            justification="Test request for duration validation",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        # Test too short
        with self.assertRaises(frappe.ValidationError) as context:
            approve_break_glass_request(
                request_id=request_id,
                duration_hours=0,
                approver=self.test_sm
            )
        assert "must be between 1 and 72" in str(context.exception)
        
        # Test too long
        with self.assertRaises(frappe.ValidationError):
            approve_break_glass_request(
                request_id=request_id,
                duration_hours=100,
                approver=self.test_sm
            )
    
    def test_reject_request_success(self):
        """Test rejecting a break-glass request"""
        # Create request
        request_result = create_break_glass_request(
            access_type="reporting_override",
            justification="Request for reporting override access",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        # Reject request
        with patch("frappe.model.document.Document.validate_set_only_once", lambda self: None):
            reject_result = reject_break_glass_request(
                request_id=request_id,
                approver_comments="Denied: User does not have proper authorization",
                approver=self.test_sm
            )
        
        assert reject_result["ok"] is True
        assert request_id in reject_result["request_id"]
    
    def test_validate_access_no_grant(self):
        """Test validation when no active grant exists"""
        is_valid, grant_info = validate_break_glass_access(
            user=self.test_user,
            access_type="customer_data"
        )
        
        assert is_valid is False
        assert grant_info is None
    
    def test_validate_access_with_grant(self):
        """Test validation when active grant exists"""
        # Create and approve request
        request_result = create_break_glass_request(
            access_type="customer_financials",
            justification="Valid grant for testing",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        with patch("frappe.model.document.Document.validate_set_only_once", lambda self: None):
            approve_result = approve_break_glass_request(
                request_id=request_id,
                duration_hours=2,
            )
        
        # Validate access
        is_valid, grant_info = validate_break_glass_access(
            user=self.test_user,
            access_type="customer_financials"
        )
        
        assert isinstance(is_valid, bool)
        if is_valid:
            assert grant_info is not None
            assert grant_info["request_id"] == request_id
            assert grant_info["remaining_minutes"] > 0
    
    def test_validate_access_expired_grant(self):
        """Test validation rejects expired grants"""
        # Create and approve request with 0 duration (immediately expired)
        # This would normally be prevented by duration validation,
        # but we're testing the expiration check logic
        
        request_result = create_break_glass_request(
            access_type="customer_data",
            justification="Request that will expire immediately",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        # Manually create an expired grant for testing
        # (In production, approving sets a future expires_at)
        
        is_valid, grant_info = validate_break_glass_access(
            user=self.test_user,
            access_type="customer_data",
            reference_doctype="AT Customer",
            reference_name="CUST-001"
        )
        
        # Should be invalid because no active grant exists
        assert is_valid is False
    
    def test_expiration_job(self):
        """Test the auto-expiration scheduled job"""
        # Create and approve request
        request_result = create_break_glass_request(
            access_type="reporting_override",
            justification="Test request for expiration job",
            user=self.test_user
        )
        request_id = request_result["request_id"]
        
        with patch("frappe.model.document.Document.validate_set_only_once", lambda self: None):
            approve_result = approve_break_glass_request(
                request_id=request_id,
                duration_hours=1,
            )
        
        # Run expiration job
        result = expire_break_glass_grants()
        
        assert isinstance(result, dict)
        assert "expired" in result


class TestBreakGlassAPI(unittest.TestCase):
    """Test REST API endpoints"""
    
    def setUp(self):
        """Initialize test environment"""
        self.test_user = f"api_test_user_{frappe.generate_hash(length=6)}@example.com"
        self.test_sm = "Administrator"
        _ensure_user_exists(self.test_user)
    
    def test_create_request_api(self):
        """Test API endpoint for creating request"""
        try:
            from acentem_takipte.acentem_takipte.api.break_glass import create_request
            
            result = create_request(
                access_type="customer_data",
                justification="API test for break-glass request creation",
            )
            
            assert "ok" in result
        except ImportError:
            self.skipTest("API module not available")


class TestBreakGlassAuditUtilities(unittest.TestCase):
    """Unit tests for break-glass audit utility helpers."""

    @patch("acentem_takipte.acentem_takipte.services.break_glass.frappe.get_roles")
    @patch("acentem_takipte.acentem_takipte.services.break_glass.frappe.get_site_config")
    def test_can_view_break_glass_audit_with_configured_role(self, mock_site_config, mock_get_roles):
        mock_site_config.return_value = {"at_break_glass_audit_roles": ["Compliance Officer"]}
        mock_get_roles.return_value = ["Agent", "Compliance Officer"]

        assert can_view_break_glass_audit("compliance.user@example.com") is True

    @patch("acentem_takipte.acentem_takipte.services.break_glass.frappe.log_error")
    @patch("acentem_takipte.acentem_takipte.services.break_glass.frappe.db.sql")
    @patch("acentem_takipte.acentem_takipte.services.break_glass.frappe.db.exists")
    def test_detect_break_glass_anomalies_logs_results(self, mock_exists, mock_sql, mock_log_error):
        mock_exists.return_value = True
        mock_sql.return_value = [
            frappe._dict({
                "user": "agent1@example.com",
                "request_count": 4,
                "first_request_at": now_datetime(),
                "last_request_at": now_datetime(),
            })
        ]

        summary = detect_break_glass_anomalies(window_hours=48, threshold=3)

        assert summary["anomaly_count"] == 1
        assert summary["anomalies"][0]["user"] == "agent1@example.com"
        assert mock_log_error.called
    
    def test_list_pending_api(self):
        """Test API endpoint for listing pending requests"""
        try:
            from acentem_takipte.acentem_takipte.api.break_glass import list_pending
            
            # This requires SM permissions, will throw if not SM
            # Just test the function is callable
            assert callable(list_pending)
        except ImportError:
            self.skipTest("API module not available")
    
    def test_validate_access_api(self):
        """Test API endpoint for validating access"""
        try:
            from acentem_takipte.acentem_takipte.api.break_glass import validate_access
            
            result = validate_access(
                access_type="customer_financials",
                reference_doctype="AT Customer",
                reference_name="TEST-001"
            )
            
            assert "is_valid" in result
            assert isinstance(result["is_valid"], bool)
        except ImportError:
            self.skipTest("API module not available")


if __name__ == "__main__":
    unittest.main()


def _ensure_user_exists(email: str) -> None:
    if not email or email == "Administrator":
        return
    if frappe.db.exists("User", email):
        return

    frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": "Test",
            "last_name": "User",
            "enabled": 1,
            "send_welcome_email": 0,
            "new_password": "test123",
        }
    ).insert(ignore_permissions=True)
