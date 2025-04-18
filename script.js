document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const monthYearDisplay = document.getElementById('month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const timeSlotsList = document.getElementById('time-slots-list');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const selectionDetails = document.getElementById('selection-details');
    const bookButton = document.getElementById('book-button');

    // --- State ---
    let currentDate = new Date();
    let selectedDate = null; // Store as 'YYYY-MM-DD' string
    let selectedTime = null; // Store as 'HH:MM' string

    // --- Simulated Availability Data ---
    // Keys are 'YYYY-MM-DD', values are arrays of 'HH:MM' available times
    const availability = {
        // Example: Add more dates and times as needed
        // Make sure dates are in the future relative to when you test
        // [getFutureDate(1)]: ["09:00", "10:00", "14:00"],
        // [getFutureDate(3)]: ["11:00", "15:00", "16:00"],
        // [getFutureDate(5)]: ["09:00", "10:00", "11:00", "14:00", "15:00"],
        // [getFutureDate(8)]: ["10:00"],
    };

    // Function to generate future dates for the example
    function getFutureDate(daysToAdd) {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    // Add some dynamic future dates to availability
    availability[getFutureDate(2)] = ["09:00", "10:00", "14:00"];
    availability[getFutureDate(4)] = ["11:00", "15:00", "16:00"];
    availability[getFutureDate(7)] = ["09:00", "10:00", "11:00", "14:00", "15:00"];
    availability[getFutureDate(10)] = ["10:00"];


    // --- Functions ---

    function renderCalendar(year, month) {
        calendarGrid.innerHTML = ''; // Clear previous grid
        timeSlotsList.innerHTML = '<li class="no-slots">Please select a date with available slots.</li>'; // Reset time slots
        selectedDateDisplay.textContent = 'Selected Date';
        resetSelection(); // Clear selection details

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDay = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

        monthYearDisplay.textContent = `${firstDayOfMonth.toLocaleString('default', { month: 'long' })} ${year}`;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date for comparison

        // Add empty cells for days before the 1st
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('empty');
            calendarGrid.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.textContent = day;
            dayCell.classList.add('day');

            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0); // Normalize cell date
            const dateString = cellDate.toISOString().split('T')[0]; // YYYY-MM-DD

            // Check if date is in the past
            if (cellDate < today) {
                dayCell.classList.add('past');
            } else {
                 // Check availability
                if (availability[dateString] && availability[dateString].length > 0) {
                    dayCell.classList.add('available');
                    dayCell.dataset.date = dateString; // Store date string
                    dayCell.addEventListener('click', handleDateClick);
                } else {
                    // Still clickable if not past, just not marked available
                     dayCell.dataset.date = dateString;
                     dayCell.addEventListener('click', handleDateClick);
                }
            }

             // Highlight if selected
            if (dateString === selectedDate) {
                dayCell.classList.add('selected');
            }

            calendarGrid.appendChild(dayCell);
        }
    }

    function handleDateClick(event) {
        const clickedDate = event.target.dataset.date;
        if (!clickedDate || event.target.classList.contains('past')) return; // Ignore clicks on past or non-date cells

        // Update selected date state
        selectedDate = clickedDate;
        selectedTime = null; // Reset time when new date is picked

        // Update UI
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth()); // Re-render to show selection
        displayTimeSlots(clickedDate);
        updateBookingDetails();
    }

    function displayTimeSlots(dateString) {
        timeSlotsList.innerHTML = ''; // Clear previous slots
        selectedDateDisplay.textContent = formatDateDisplay(dateString); // Show formatted date

        const slots = availability[dateString];

        if (slots && slots.length > 0) {
            slots.forEach(time => {
                const slotItem = document.createElement('li');
                slotItem.textContent = time;
                slotItem.dataset.time = time;
                slotItem.addEventListener('click', handleTimeClick);
                timeSlotsList.appendChild(slotItem);
            });
        } else {
            timeSlotsList.innerHTML = '<li class="no-slots">No available slots for this date.</li>';
        }
         resetSelection(); // Clear booking details when date changes before time is picked
    }

     function handleTimeClick(event) {
        const clickedTime = event.target.dataset.time;
        if (!clickedTime) return;

        selectedTime = clickedTime;

        // Update UI for time slots (highlight selection)
        const allSlots = timeSlotsList.querySelectorAll('li');
        allSlots.forEach(slot => slot.classList.remove('selected'));
        event.target.classList.add('selected');

        updateBookingDetails();
    }

    function updateBookingDetails() {
        if (selectedDate && selectedTime) {
            selectionDetails.textContent = `Selected: ${formatDateDisplay(selectedDate)} at ${selectedTime}`;
            bookButton.disabled = false;
        } else {
             resetSelection();
        }
    }

     function resetSelection() {
        selectionDetails.textContent = 'No slot selected.';
        bookButton.disabled = true;
        selectedTime = null; // Ensure time is cleared if only date was selected
        // Optionally clear time slot highlighting if needed
        const allSlots = timeSlotsList.querySelectorAll('li');
        allSlots.forEach(slot => slot.classList.remove('selected'));
    }


    function handleBooking() {
        if (selectedDate && selectedTime) {
            // --- REAL APPLICATION WOULD SEND DATA TO SERVER HERE ---
            alert(`Booking Confirmed (Demo):\nDate: ${formatDateDisplay(selectedDate)}\nTime: ${selectedTime}\n\nThank you!`);

            // Optional: Reset after booking
            selectedDate = null;
            selectedTime = null;
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth()); // Re-render calendar
            timeSlotsList.innerHTML = '<li class="no-slots">Please select a date with available slots.</li>';
            selectedDateDisplay.textContent = 'Selected Date';
            resetSelection();

        } else {
            alert("Please select both a date and a time slot.");
        }
    }

    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        // Deselect date when changing month
        selectedDate = null;
        selectedTime = null;
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }

    function formatDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00'); // Add time part to avoid timezone issues
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // --- Event Listeners ---
    prevMonthButton.addEventListener('click', () => changeMonth(-1));
    nextMonthButton.addEventListener('click', () => changeMonth(1));
    bookButton.addEventListener('click', handleBooking);

    // --- Initial Render ---
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
});
