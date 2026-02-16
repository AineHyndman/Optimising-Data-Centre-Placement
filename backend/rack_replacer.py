from position import Position
from RM import Rack


class rack_replacer:
    max_racks_to_replace = 32
    racks_changed = 0

    def __init__(self, constraints, power, capacity):
        self.constraints = constraints
        self.power = power
        self.capacity = capacity

    def identify_suitable_rack_position(self, position: Position):
        pass

    def replace_racks(self, position: Position):
        rack_type = position.rack
        if rack_type is None:
            print(f"No rack at position {position.__repr__}")
            return
        code = rack_type.code
        if rack_type is not None and self.is_valid_rack(rack_type):

            print(f"Replacing rack {position.rack} at " f"position {position.__repr__}")
            position.removeRack()
            if code == "c23":

                position.addRack(Rack("c25"))
            elif code == "s23":

                position.addRack(Rack("s25"))
            else:
                position.addRack(Rack("a25"))

    def is_valid_rack(self, rack: Rack):
        if rack.code == "c23" or rack.code == "s23" or rack.code == "a23":
            return True
        else:
            return False
