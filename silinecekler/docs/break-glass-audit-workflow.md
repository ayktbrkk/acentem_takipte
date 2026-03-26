# Break-Glass Audit Workflow

## Overview

The break-glass audit workflow enables temporary escalation of user access to restricted data with complete audit logging and time-bound controls. This is essential for emergency access scenarios while maintaining compliance and auditability.

**Key Features:**
- Request-based approval workflow (users request, System Managers approve)
- Time-bound grants (1-72 hours, default 24h)
- Automatic expiration via scheduled job
- Full audit trail in Frappe Error Log
- Role-based access control (SM approval only)
- Validation + justification requirements

## Architecture

### Doctype: AT Break Glass Request
**Purpose**: Stores all break-glass requests and their approval status.

**Fields:**
```
user                   [Link to User]    - Who requested access
access_type            [Select]          - Type of access requested
reference_doctype      [Link to DocType] - Optional target resource type
reference_name         [Dynamic Link]    - Optional target resource ID
justification          [Text Editor]     - Business reason (min 20 chars)
status                 [Select, RO]      - Pending | Approved | Rejected | Expired
approved_by            [Link to User]    - System Manager who approved (RO)
approver_comments      [Text Editor]     - Approval/rejection reasoning
duration_hours         [Int]             - Access validity 1-72h (default 24h)
created_at_ts          [DateTime, RO]    - Request creation timestamp
approved_at_ts         [DateTime, RO]    - Approval timestamp
expires_at_ts          [DateTime, RO]    - Expiration timestamp (calculated)
```

**Workflow:**
```
[User] → Create Request (Pending) → [SM Review] → Approve (expires_at calculated)
                                            ↓
                                         Reject (status=Rejected)
                                            ↓
                          (Automatic) Expire after expires_at passes
```

### Service: `acentem_takipte.services.break_glass`

**Core Functions:**

#### 1. `create_break_glass_request()`
```python
def create_break_glass_request(
    access_type: str,              # customer_data|customer_financials|system_admin|reporting_override
    justification: str,            # Business reason (>= 20 chars)
    reference_doctype: str = None,
    reference_name: str = None,
    user: str = None               # Defaults to current user
) -> dict:
    """
    Returns: {
        ok: True|False,
        request_id: str,
        status: "Pending",
        message: str,
        error?: str,
        title?: str
    }
    """
```

**Example:**
```python
from acentem_takipte.acentem_takipte.services.break_glass import create_break_glass_request

result = create_break_glass_request(
    access_type="customer_financials",
    justification="Emergency override needed for VIP customer billing dispute resolution",
    reference_doctype="AT Customer",
    reference_name="CUST-001"
)
# {ok: True, request_id: "000001", status: "Pending", message: "..."}
```

#### 2. `approve_break_glass_request()` (SM only)
```python
def approve_break_glass_request(
    request_id: str,
    duration_hours: int = 24,      # 1-72
    approver_comments: str = None,
    approver: str = None           # Defaults to current user
) -> dict:
    """
    Returns: {
        ok: True|False,
        request_id: str,
        expires_at: str,
        message: str,
        error?: str,
        title?: str
    }
    """
```

**Example:**
```python
result = approve_break_glass_request(
    request_id="000001",
    duration_hours=4,
    approver_comments="Approved for urgent billing review - limit to 4 hours"
)
# {ok: True, request_id: "000001", expires_at: "2026-03-25 14:30:00", message: "..."}
```

#### 3. `reject_break_glass_request()` (SM only)
```python
def reject_break_glass_request(
    request_id: str,
    approver_comments: str = None,
    approver: str = None
) -> dict:
```

#### 4. `validate_break_glass_access()` (Runtime check)
```python
def validate_break_glass_access(
    user: str,
    access_type: str,
    reference_doctype: str = None,
    reference_name: str = None
) -> tuple[bool, dict | None]:
    """
    Returns: (
        is_valid: bool,
        grant_info: {
            request_id: str,
            grant_type: str,
            expires_at: str,
            remaining_minutes: int,
            reference: str
        } | None
    )
    """
```

**Example Usage (in permission hooks):**
```python
def has_customer_permission(doc, user=None, permission_type="read"):
    user = user or frappe.session.user
    
    # Check normal branch-based permission first
    if has_branch_permission(doc, user):
        return True
    
    # Fall back to break-glass grant
    is_valid, grant = validate_break_glass_access(
        user=user,
        access_type="customer_data",
        reference_doctype="AT Customer",
        reference_name=doc.name
    )
    
    if is_valid:
        frappe.logger().warning(
            f"Customer access via break-glass: {user} → {doc.name} "
            f"(expires in {grant['remaining_minutes']} minutes)"
        )
        return True
    
    return False
```

#### 5. `expire_break_glass_grants()` (Scheduled job)
```python
def expire_break_glass_grants() -> dict:
    """
    Automatic job triggered hourly by scheduler.
    Sets status='Expired' for all approved requests with expires_at < now().
    Returns: {expired: int, error?: str}
    """
```

**Scheduled:** Hourly via `hooks.py` → `"0 * * * *"` cron

### API Endpoints

#### REST Endpoints (in `acentem_takipte.api.break_glass`)

**1. Create Request**
```
POST /api/method/acentem_takipte.api.break_glass.create_request

Request:
{
    "access_type": "customer_financials",
    "justification": "Emergency billing review",
    "reference_doctype": "AT Customer",
    "reference_name": "CUST-001"
}

Response:
{
    "ok": true,
    "request_id": "000001",
    "status": "Pending",
    "message": "Break-glass request submitted for approval..."
}
```

**2. List Pending** (SM only)
```
GET /api/method/acentem_takipte.api.break_glass.list_pending

Response:
[
    {
        "name": "000001",
        "user": "user@example.com",
        "access_type": "customer_financials",
        "reference": "AT Customer:CUST-001",
        "created_at": "2026-03-25 10:15:00",
        "justification": "Emergency billing review for VIP customer dispute..."
    },
    ...
]
```

**3. Approve Request** (SM only)
```
POST /api/method/acentem_takipte.api.break_glass.approve_request

Request:
{
    "request_id": "000001",
    "duration_hours": "4",
    "approver_comments": "Approved - limit to 4 hours for billing review"
}

Response:
{
    "ok": true,
    "request_id": "000001",
    "expires_at": "2026-03-25 14:30:00",
    "message": "Break-glass request approved. Access valid until..."
}
```

**4. Reject Request** (SM only)
```
POST /api/method/acentem_takipte.api.break_glass.reject_request

Request:
{
    "request_id": "000001",
    "approver_comments": "Denied - policy prevents escalation for this user type"
}

Response:
{
    "ok": true,
    "request_id": "000001",
    "message": "Break-glass request rejected"
}
```

**5. Validate Access** (Self-check)
```
POST /api/method/acentem_takipte.api.break_glass.validate_access

Request:
{
    "access_type": "customer_financials",
    "reference_doctype": "AT Customer",
    "reference_name": "CUST-001"
}

Response:
{
    "is_valid": true,
    "remaining_minutes": 120,
    "expires_at": "2026-03-25 14:30:00",
    "message": "You have active break-glass access until..."
}
```

## Audit Trail

All break-glass events are logged to Frappe Error Log with title pattern `[Break-Glass Audit] {ACTION} | {REQUEST_ID}`.

**Audit Fields:**
- Request ID (unique identifier)
- User (who requested)
- Action (approved|rejected|accessed|expired)
- Access Type (customer_data|customer_financials|...)
- Approved By (SM who approved)
- Expires At (when grant expires)
- Reference (resource being accessed)

**Query Audit Events:**
```sql
SELECT modified, title, message FROM `tabError Log`
WHERE title LIKE '[Break-Glass Audit]%'
ORDER BY modified DESC;
```

## Integration Points

### 1. Permission Hooks
Forward-looking: Add break-glass validation as fallback in permission functions.

```python
# In doctype/branch_permissions.py

def has_customer_permission(doc, user=None, permission_type="read"):
    user = user or frappe.session.user
    
    # Branch-based permission check first
    if permitted_by_branch(user, doc.office_branch):
        return True
    
    # Break-glass fallback
    from acentem_takipte.acentem_takipte.services.break_glass import validate_break_glass_access
    is_valid, grant = validate_break_glass_access(user, "customer_data", "AT Customer", doc.name)
    return is_valid
```

### 2. Admin Dashboard (Sprint E.2)
Planned: System Manager dashboard to view/approve/reject pending requests.

**Features:**
- List pending requests with user/access_type/created_at
- One-click approve/reject
- Duration selector (1-72h)
- Audit trail viewer

### 3. Cache Invalidation
Break-glass doesn't interact with scope caching (cache_precomputation.py). Caching is for normal scope (branches + sales_entities), not emergency access.

## Security Considerations

**Design Decisions:**
1. **Request-based, not grant-based**: Users request, managers approve (audit trail of approval)
2. **Time-bounded**: All grants automatically expire; no "forever" access
3. **Justification required**: Min 20-char business reason prevents frivolous requests
4. **Duplicate check**: Prevents multiple pending requests for same access type
5. **Audit logging**: Every action logged with user + timestamp + approver
6. **SM-only approval**: Only System Managers can approve or reject

**Abuse Prevention:**
- Rate limiting: Check logs for users with repeated requests
- Duration limiting: Approve only minimum time needed (1-24h typical)
- Scope limiting: Restrict to specific resource when possible
- Logging review: Audit trail in Error Log flagged with [Break-Glass Audit]

## Testing

**Unit Tests: (To be created)**
```python
# tests/test_break_glass.py

def test_create_request():
    """Test creating a break-glass request"""

def test_approve_request():
    """Test approving with automatic expiration calc"""

def test_reject_request():
    """Test rejection with audit logging"""

def test_validate_access():
    """Test runtime validation of active grant"""

def test_auto_expiration():
    """Test scheduled job marks expired grants"""

def test_duplicate_prevention():
    """Test duplicate pending request rejection"""

def test_sm_only_approval():
    """Test non-SM cannot approve"""
```

## Operational Procedures

### For Users (Requesting Access)
1. Click "Request Access" in restricted area
2. Select access type and reference resource
3. Enter business justification (≥20 chars)
4. Submit request
5. **Notification**: Receive approval/rejection within 4 hours
6. If approved: Access granted for duration (e.g., 24 hours)
7. If rejected: Check approver comments for reason

### For System Managers (Approving)
1. Check "Break-Glass Requests" dashboard
2. Review pending requests (user, access_type, reason)
3. Decide: Approve or Reject
4. If approving:
   - Select duration (1-72h, default 24h)
   - Add approval comments
5. If rejecting:
   - Add reasons in rejection comments
6. **Automatic**: Expires at calculated time; no manual revocation needed

### For Auditors (Compliance Review)
1. Query Error Log for `[Break-Glass Audit]` entries
2. Filter by date range and user
3. Verify all approvals were justified
4. Check grant durations match business need
5. Flag unusual patterns (user with 10+ requests/week)

## Configuration

**Site Config Options:**
Not yet implemented; defaults are:
- Break-glass duration max: 72 hours
- Minimum justification length: 20 characters
- Expiration check: Every 1 hour (via scheduler)

Future: Add `site_config.json` options for duration limits, rate limiting, etc.

## Known Limitations & TODOs

**Sprint E Pending:**
- [ ] Login-time pre-computation not yet wired to break-glass (separate cache concern)
- [ ] Frontend dashboard for SM approval workflow (Sprint E.2)
- [ ] Rate limiting on request creation (prevent spam)
- [ ] Email notifications to approvers/requesters

**Out of Scope:**
- Integration with OAuth/SSO approval workflows
- Biometric re-authentication (use OS or Frappe User features)
- Role-based break-glass (all emergency access is System Manager approval)

## See Also

- `docs/acente-erisim.md` - Overall access control model
- `acentem_takipte/doctype/branch_permissions.py` - Permission hooks integration point
- `acentem_takipte/services/cache_precomputation.py` - Scope caching (unrelated)
