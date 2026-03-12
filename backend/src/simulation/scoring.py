# scoring.py

import statistics
from state import SuiteState

MAX_POWER_KW = 500        # change if needed
MAX_RSU_CAPACITY = 1000   # change if needed


def score(state: SuiteState) -> float:

    return (
        capacity_score(state)
        + balance_score(state)
        - power_penalty(state)
        - rsu_penalty(state)
        - frag_penalty(state)
    )


def capacity_score(state: SuiteState) -> float:

    total_positions = len(state.positions)
    empty_positions = state.get_empty_positions()

    if total_positions == 0:
        return 0

    fill_ratio = (total_positions - empty_positions) / total_positions

    return fill_ratio * 100


def power_penalty(state: SuiteState) -> float:

    total_power = state.total_power_kw()

    if total_power <= MAX_POWER_KW:
        return 0

    return 10 * (total_power - MAX_POWER_KW)


def rsu_penalty(state: SuiteState) -> float:
    

    rsu_usage = state.get_rsu_per_service()
    total_rsu = sum(rsu_usage.values())

    if total_rsu <= MAX_RSU_CAPACITY:
        return 0

    return 10 * (total_rsu - MAX_RSU_CAPACITY)


def frag_penalty(state: SuiteState) -> float:
    

    empty_positions = state.get_empty_positions()

    return empty_positions * 2


def balance_score(state: SuiteState) -> float:
   
    row_dist = state.get_row_distribution()
    counts = list(row_dist.values())

    if len(counts) <= 1:
        return 0

    variance = statistics.variance(counts)

    return 100 / (1 + variance)