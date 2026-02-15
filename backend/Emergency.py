class EmergencyPower:
    def __init__(self):
        self.days = 0
        self.cool_days = 0
        self.active = False
        self.cooldown = False
    
    def reset(self):
        self.days = 0
        self.active = False
    
    def available_days(self) -> int:
        return 0 if self.cooldown else 7 - self.days
    
    def progress(self):
        if self.active and not self.cooldown:
            self.days += 1
            if self.days == 7:
                self.cooldown = True
                self.active = False
                self.days = 0
        elif self.cooldown:
            self.cool_days += 1
            if self.cool_days >= 2:
                self.cool_days = 0
                self.cooldown = False