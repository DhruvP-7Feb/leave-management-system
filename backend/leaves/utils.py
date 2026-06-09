from datetime import timedelta

from .models import PublicHoliday


def calculate_working_days(
    start_date,
    end_date
):

    working_days = 0

    holiday_dates = PublicHoliday.objects.values_list(
        'date',
        flat=True
    )

    current_date = start_date

    while current_date <= end_date:

        is_weekday = current_date.weekday() < 5

        is_holiday = current_date in holiday_dates

        if is_weekday and not is_holiday:

            working_days += 1

        current_date += timedelta(days=1)

    return working_days