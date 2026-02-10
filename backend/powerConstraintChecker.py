from suite.py import Suite

# Check Suite
def suite_available_power(Suite mySuite) -> int:
    return mySuite.allowed_power_kw() - mySuite.total_power_kw()
    # Returns in kw

def emergency_power_active(Suite mySuite) -> bool:
    return mySuite.total_power_kw() > mySuite.max_power_kw()

class emergencyPower:
    def __init__(self, Suite mySuite):
        self.mySuite = mySuite
        self.days = 0
    
    def available_days(self) -> int:
        self.days += 1
        if self.days > 7:
            raise ValueError("Max usage for emergency power exceeds limits")
        return 7 - self.days