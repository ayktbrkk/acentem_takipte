import frappe
import logging

def init_sentry():
    """Initializes Sentry for backend error tracking if a DSN is provided in site_config.json."""
    if frappe.flags.sentry_initialized:
        return

    site_config = frappe.get_site_config()
    sentry_dsn = site_config.get("sentry_dsn")
    
    if not sentry_dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
        from sentry_sdk.integrations.wsgi import SentryWsgiMiddleware

        sentry_logging = LoggingIntegration(
            level=logging.INFO,        # Capture info and above as breadcrumbs
            event_level=logging.ERROR  # Send errors as events
        )

        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[sentry_logging, RedisIntegration()],
            environment=site_config.get("sentry_environment", "production"),
            traces_sample_rate=site_config.get("sentry_traces_sample_rate", 0.1),
        )
        
        frappe.flags.sentry_initialized = True
        
    except ImportError:
        # sentry-sdk not installed, skip initialization
        pass
    except Exception as e:
        # Don't crash the app if Sentry fails to init
        frappe.log_error(title="Sentry Initialization Error", message=str(e))

def capture_exception(exception=None):
    """Manually captures an exception to Sentry."""
    try:
        import sentry_sdk
        sentry_sdk.capture_exception(exception)
    except ImportError:
        pass
