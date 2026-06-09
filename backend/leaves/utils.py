from datetime import timedelta


def calculate_working_days(
    start_date,
    end_date
):

    working_days = 0

    current_date = start_date

    while current_date <= end_date:

        if current_date.weekday() < 5:
            working_days += 1

        current_date += timedelta(days=1)

    return working_days