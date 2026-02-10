class emergencyPower:
    def __init__(self):
        self.days = 0
        self.active = False
    
    def new_day(self):
        self.days += 1
        if self.days > 7:
            raise ValueError("Max usage for emergency power exceeds limits")
    
    def available_days(self) -> int:
        return 7 - self.days
