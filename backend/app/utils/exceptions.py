class VendorBridgeError(Exception):
    status_code = 500

    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code or self.status_code
        self.details = details


class ValidationError(VendorBridgeError):
    status_code = 400


class UnauthorizedError(VendorBridgeError):
    status_code = 401


class ForbiddenError(VendorBridgeError):
    status_code = 403


class NotFoundError(VendorBridgeError):
    status_code = 404


class ConflictError(VendorBridgeError):
    status_code = 409


class ServiceUnavailableError(VendorBridgeError):
    status_code = 503


class InternalError(VendorBridgeError):
    status_code = 500