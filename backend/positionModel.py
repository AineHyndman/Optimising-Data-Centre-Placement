class PositionModel:
    
    def __init__(self, rack, suite, row, position):
        self.row = row
        self.position = position
        self.suite = suite
        self.rack = rack
    
    def __repr__(self):
        return f"rackPosition(Suite={self.suite}, Row={self.row}, Position={self.position}, Rack={self.rack})"

    def removeRack(self):
        if (self.rack != None):
            self.rack = None
        else:
            raise ValueError("Rack is already empty.")
        
    def addRack(self, rack):
        if (self.rack == None):
            self.rack = rack
        else:
            raise ValueError(f"There is already a {self.rack} rack.")
    
    def getRack(self):
        return self.rack

    def setSuite(self, number):
        if (number <= 3 and number >= 0):
            self.suite = number
        else:
            raise ValueError("Suite index must be between 0 and 3.")

    def getSuite(self):
        return self.suite
    
    def setRow(self, number):
        if (number <= 47 and number >= 0):
            self.row = number
        else:
            raise ValueError("Row index must be between 0 and 47.")          

    def getRow(self):
        return self.row

    def setPosition(self, number):
        if (number <= 15 and number >= 0):
            self.position = number
        # else:
            raise ValueError("Position index must be between 0 and 15.")       

    def getPosition(self):
        return self.position
    
        
    
        
