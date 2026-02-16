from typing import Optional

from RM import Rack


class Position:
    
    def __init__(self, rack: Optional[Rack]=None, suite: int = 0, row: int = 0, position: int = 0):
        self.rack: Optional[Rack] = rack
        self.suite = suite
        self.row = row
        self.position = position
    
    def __repr__(self):
        return (
            f"Position(Suite={self.suite}, "
            f"Row={self.row}, "
            f"Position={self.position}, "
            f"Rack={self.rack})"
        )

    def removeRack(self):
        if self.rack is not None:
            self.rack = None
        else:
            raise ValueError("Rack is already empty.")
        
    def addRack(self, rack):
        if self.rack is None:
            self.rack = rack
        else:
            raise ValueError(f"There is already a {self.rack} rack.")
    
    def getRack(self):
        return self.rack

    def setSuite(self, number):
        if 0 <= number <= 3:
            self.suite = number
        else:
            raise ValueError("Suite index must be between 0 and 3.")

    def getSuite(self):
        return self.suite
    
    def setRow(self, number):
        if 0 <= number <= 47:
            self.row = number
        else:
            raise ValueError("Row index must be between 0 and 47.")          

    def getRow(self):
        return self.row

    def setPosition(self, number):
        if 0 <= number <= 15:
            self.position = number
        else:
            raise ValueError("Position index must be between 0 and 15.")       

    def getPosition(self):
        return self.position
    