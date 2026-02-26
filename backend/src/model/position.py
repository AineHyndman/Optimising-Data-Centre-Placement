# Import Optional for type hinting values that may be None
from typing import Optional

# Import the Rack model used to associate a rack with a position
from src.model.rack import Rack


# Represents a physical position within a data center layout
# A position may optionally hold a Rack and is identified by suite, row, and position indices
class Position:

    # Initialize a Position object
    # rack: optional Rack placed at this position
    # suite: suite index (default 0)
    # row: row index within the suite (default 0)
    # position: position index within the row (default 0)
    def __init__(
        self,
        rack: Optional[Rack] = None,
        suite: int = 0,
        row: int = 0,
        position: int = 0,
    ):
        # Rack currently placed at this position (or None if empty)
        self.rack: Optional[Rack] = rack

        # Suite number where the position is located
        self.suite = suite

        # Row number within the suite
        self.row = row

        # Position number within the row
        self.position = position

    # String representation of the Position object for debugging and logging
    def __repr__(self):
        return (
            f"Position(Suite={self.suite}, "
            f"Row={self.row}, "
            f"Position={self.position}, "
            f"Rack={self.rack})"
        )

    # Returns the rack assigned to this position
    def getRack(self):
        return self.rack

    # Sets the suite number with validation
    # Valid suite indices are between 0 and 3 inclusive
    def setSuite(self, number):
        if 0 <= number <= 3:
            self.suite = number
        else:
            raise ValueError("Suite index must be between 0 and 3.")

    # Returns the suite number
    def getSuite(self):
        return self.suite

    # Sets the row number with validation
    # Valid row indices are between 0 and 47 inclusive
    def setRow(self, number):
        if 0 <= number <= 47:
            self.row = number
        else:
            raise ValueError("Row index must be between 0 and 47.")

    # Returns the row number
    def getRow(self):
        return self.row

    # Sets the position index within the row with validation
    # Valid position indices are between 0 and 15 inclusive
    def setPosition(self, number):
        if 0 <= number <= 15:
            self.position = number
        else:
            raise ValueError("Position index must be between 0 and 15.")

    # Returns the position index
    def getPosition(self):
        return self.position