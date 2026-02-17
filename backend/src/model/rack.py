import json

# Opens "racks.json" as a readable file
with open("racks.json", "r") as rackfile:
    # Build a dictionary with Codes for keys
    racks = {r["Code"]: r for r in json.load(rackfile)}


# Class for the racks
class Rack:
    def __init__(self, code):
        # Set code to the inputted code
        self.code = code

        # Set the default values for the variables below to none
        self.type = None
        self.generation = None
        self.powerNeed = None
        self.capacity = None
        self.color = None
        self.empty = False

        # Get the correct rack row
        rack = racks.get(code)
        if rack is None:
            raise ValueError("Not valid code")

        if self.code is "":
            self.empty = True

        # Change the variables to their correct values
        self.type = rack["Type"]
        self.generation = int(rack["Generation"])
        self.powerNeed = int(rack["Power Need (kW)"])
        self.capacity = float(rack["Capacity Output (RSU)"])
        self.color = rack["Color"]

        # If any of the variables apart from "code" are none, it raises an error
        if (
            self.type is None
            or self.generation is None
            or self.powerNeed is None
            or self.capacity is None
            or self.color is None
        ):
            raise ValueError("Not valid code")

    def __repr__(self):
        return (
            f"Rack=(code={self.code}, "
            f"type={self.type}, "
            f"generation={self.generation}, "
            f"powerNeed={self.powerNeed}, "
            f"capacity={self.capacity}, "
            f"color={self.color})"
        )
