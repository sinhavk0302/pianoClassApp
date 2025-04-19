document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Ensure these elements exist in your schedule.html
    const monthYearDisplay = document.getElementById('month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const timeSlotsList = document.getElementById('time-slots-list');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const selectionDetails = document.getElementById('selection-details');
    const bookButton = document.getElementById('book-button');

    // Check if all essential elements were found
    if (!monthYearDisplay || !calendarGrid || !prevMonthButton || !nextMonthButton || !timeSlotsList || !selectedDateDisplay || !selectionDetails || !bookButton) {
        console.error("One or more essential DOM elements for the scheduler were not found. Check IDs in schedule.html.");
        // Optionally display an error message to the user on the page
        // document.getElementById('scheduler').innerHTML = '<p style="color: red;">Error: Could not initialize the scheduler. Please contact support.</p>';
        return; // Stop execution if elements are missing
    }

    // --- State ---
    let currentDate = new Date();
    let selectedDate = null; // Store as 'YYYY-MM-DD' string
    let selectedTime = null; // Store as 'HH:MM' string

    // --- Simulated Availability Data ---
    // Keys are 'YYYY-MM-DD', values are arrays of 'HH:MM' available times
    // NOTE: In a real app, this would come from a server/backend
    const availability = {};

    // Function to generate future dates for the example
    function getFutureDate(daysToAdd) {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        // Ensure month and day are two digits
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // Format as YYYY-MM-DD
    }

    // Add some dynamic future dates to availability for demonstration
    availability[getFutureDate(2)] = ["09:00", "10:00", "14:00"];
    availability[getFutureDate(4)] = ["11:00", "15:00", "16:00"];
    availability[getFutureDate(7)] = ["09:00", "10:00", "11:00", "14:00", "15:00"];
    availability[getFutureDate(10)] = ["10:00"];
    availability[getFutureDate(11)] = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]; // Add more slots


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

            // Use the same formatting as getFutureDate for consistency
            const cellYear = cellDate.getFullYear();
            const cellMonth = String(cellDate.getMonth() + 1).padStart(2, '0');
            const cellDay = String(cellDate.getDate()).padStart(2, '0');
            const dateString = `${cellYear}-${cellMonth}-${cellDay}`; // YYYY-MM-DD

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
                    // Make non-available future dates non-clickable or visually distinct if desired
                    // For now, we allow clicking to show "No slots" message
                    dayCell.dataset.date = dateString;
                    dayCell.addEventListener('click', handleDateClick);
                    // Optionally add a class like 'unavailable' for styling
                    // dayCell.classList.add('unavailable');
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
        // Only proceed if it's a valid date cell and not marked as 'past'
        if (!clickedDate || event.target.classList.contains('past')) {
            return;
        }

        // Update selected date state
        selectedDate = clickedDate;
        selectedTime = null; // Reset time when new date is picked

        // Update UI
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth()); // Re-render to show selection highlight
        displayTimeSlots(clickedDate);
        // updateBookingDetails is called within displayTimeSlots via resetSelection
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
         resetSelection(); // Clear booking details and disable button when date changes before time is picked
    }

     function handleTimeClick(event) {
        const clickedTime = event.target.dataset.time;
        // Ensure the clicked element is actually a time slot li
        if (!clickedTime || !event.target.matches('li') || event.target.classList.contains('no-slots')) {
            return;
        }

        selectedTime = clickedTime;

        // Update UI for time slots (highlight selection)
        const allSlots = timeSlotsList.querySelectorAll('li');
        allSlots.forEach(slot => slot.classList.remove('selected'));
        event.target.classList.add('selected');

        updateBookingDetails(); // Update confirmation text and enable button
    }

    function updateBookingDetails() {
        if (selectedDate && selectedTime) {
            // Note: This doesn't include the timezone from previous steps.
            // If timezone is needed, it should be added back here.
            selectionDetails.textContent = `Selected: ${formatDateDisplay(selectedDate)} at ${selectedTime}`;
            bookButton.disabled = false;
        } else {
             // This case is handled by resetSelection, but good for clarity
             selectionDetails.textContent = 'No slot selected.';
             bookButton.disabled = true;
        }
    }

     function resetSelection() {
        selectionDetails.textContent = 'No slot selected.';
        bookButton.disabled = true;
        // selectedTime = null; // Resetting state variable if needed, though handleDateClick does this too
        // Clear visual selection from time slots
        const allSlots = timeSlotsList.querySelectorAll('li');
        allSlots.forEach(slot => slot.classList.remove('selected'));
    }


    function handleBooking() {
        if (selectedDate && selectedTime) {
            // --- REAL APPLICATION WOULD SEND DATA (selectedDate, selectedTime, selectedTimezone) TO SERVER HERE ---
            // Note: This doesn't include the timezone from previous steps.
            alert(`Booking Confirmed (Demo):\nDate: ${formatDateDisplay(selectedDate)}\nTime: ${selectedTime}\n\nThank you!`);

            // --- SIMULATE REMOVING SLOT (for demo purposes only) ---
            // In a real app, the server would handle this, and you'd refresh availability
            if (availability[selectedDate]) {
                availability[selectedDate] = availability[selectedDate].filter(time => time !== selectedTime);
            }
            // --- End Simulation ---


            // Reset state and UI after booking
            selectedDate = null;
            selectedTime = null;
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth()); // Re-render calendar (will reset slots list)
            // timeSlotsList.innerHTML = '<li class="no-slots">Please select a date with available slots.</li>'; // Already done by renderCalendar
            // selectedDateDisplay.textContent = 'Selected Date'; // Already done by renderCalendar
            // resetSelection(); // Already done by renderCalendar

        } else {
            alert("Please select both a date and a time slot.");
        }
    }

    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        // Deselect date when changing month to avoid confusion
        selectedDate = null;
        selectedTime = null;
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }

    function formatDateDisplay(dateString) {
        // Add time part 'T00:00:00' to ensure the date isn't interpreted in UTC and shifted
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // --- Event Listeners ---
    prevMonthButton.addEventListener('click', () => changeMonth(-1));
    nextMonthButton.addEventListener('click', () => changeMonth(1));
    bookButton.addEventListener('click', handleBooking);

    // --- Initial Render ---
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());

}); // End of DOMContentLoaded listener
