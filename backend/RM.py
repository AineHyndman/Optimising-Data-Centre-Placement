import csv

class rack:
    def __init__(self, code):
        self.code = code

        self.type = None
        self.generation = None
        self.powerNeed = None
        self.capacity = None

        with open("racks.csv", 'r', newline = "") as rackfile:
            reader = csv.DictReader(rackfile)
            for row in reader:
                if row["Code"] == self.code:
                    self.type = row["Type"]
                    self.generation = row["Generation"]
                    self.generation = int(self.generation)
                    self.powerNeed = row["Power Need (kW)"]
                    self.powerNeed = int(self.powerNeed)
                    self.capacity = row["Capacity Output (RSU)"]
                    self.capacity = float(self.capacity)
        
        if self.type is None or self.generation is None or self.powerNeed is None or self.capacity is None:
            raise ValueError("Not valid code")

    
    def print(self):
        print("Code:", self.code, "  Generation:", self.generation, "  Power Consumption:", self.powerNeed, "kW  Capacity Output:", self.capacity)

def main():
    myRack = rack("a25")
    myRack.print()
    print(myRack.generation + 6)

main()