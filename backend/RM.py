import json

# Opens "racks.json" as a readable file
with open("racks.json", 'r') as rackfile:

    # Loads values from the file into rack_list
    rack_list = json.load(rackfile)

    # Build a dictionary with Codes for keys
    racks = {r["Code"]: r for r in rack_list}

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

        # Get the correct rack row
        rack = racks.get(code)
        if rack is None:
            raise ValueError("Not valid code")

        # Change the variables to their correct values
        self.type = rack["Type"]
        self.generation = int(rack["Generation"])
        self.powerNeed = int(rack["Power Need (kW)"])
        self.capacity = float(rack["Capacity Output (RSU)"])
        
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