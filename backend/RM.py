import csv

# Class for the racks
class rack:
    def __init__(self, code):
        # Set code to the inputted code
        self.code = code

        # Set the default values for the variables below to none
        self.type = None
        self.generation = None
        self.powerNeed = None
        self.capacity = None

        # Opens "racks.csv" as a readable file
        with open("racks.csv", 'r', newline = "") as rackfile:

            # rackReader interprets the file as a dictionary with the headers as the keys
            rackReader = csv.DictReader(rackfile)

            # Reads the rows until the correct code is found
            for row in rackReader:
                if row["Code"] == self.code:
                    # Set the variable values to the correct ones
                    self.type = row["Type"]
                    self.generation = int(row["Generation"])
                    self.powerNeed = int(row["Power Need (kW)"])
                    self.capacity = float(row["Capacity Output (RSU)"])
        
        # If any of the variables apart from "code" are none, it raises an error
        if self.type is None or self.generation is None or self.powerNeed is None or self.capacity is None:
            raise ValueError("Not valid code")

    # Function to print all the values
    def print(self):
        print("Code:", self.code, "  Generation:", self.generation, "  Power Consumption:", self.powerNeed, "kW  Capacity Output:", self.capacity, "RSU")

"""
def test():
    myRack = rack("a25")
    myRack.print()
    print(myRack.generation + 6)

test()
"""