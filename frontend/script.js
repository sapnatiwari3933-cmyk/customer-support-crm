/* =========================================================
   SUPPORTDESK CRM
   Main JavaScript
   Frontend + Backend API Integration
========================================================= */

"use strict";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE =
    "https://customer-support-crm-backend.onrender.com/api/tickets";


/* =========================================================
   GLOBAL DATA
========================================================= */

let allTickets = [];


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function formatDate(dateValue) {
    if (!dateValue) {
        return "N/A";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getStatusClass(status) {
    if (status === "Open") {
        return "status-open";
    }

    if (status === "In Progress") {
        return "status-progress";
    }

    if (status === "Closed") {
        return "status-closed";
    }

    return "status-open";
}


function getPriorityClass(priority) {
    if (priority === "High") {
        return "priority-high";
    }

    if (priority === "Low") {
        return "priority-low";
    }

    return "priority-medium";
}


function getPriority(ticket) {
    return ticket.priority || "Medium";
}


function getSLAInfo(ticket) {
    if (!ticket || !ticket.created_at) {
        return {
            text: "N/A",
            className: "sla-ok"
        };
    }

    if (ticket.status === "Closed") {
        return {
            text: "Resolved",
            className: "sla-ok"
        };
    }

    const createdTime = new Date(ticket.created_at).getTime();
    const now = Date.now();

    const hoursPassed =
        (now - createdTime) / (1000 * 60 * 60);

    if (hoursPassed > 24) {
        return {
            text: "Overdue",
            className: "sla-overdue"
        };
    }

    if (hoursPassed > 20) {
        return {
            text: "Due Soon",
            className: "sla-warning"
        };
    }

    return {
        text: "Within SLA",
        className: "sla-ok"
    };
}


/* =========================================================
   DASHBOARD - LOAD TICKETS
========================================================= */

async function loadTickets() {
    const tableBody =
        document.getElementById("ticketTableBody");

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-row">
                    Loading tickets...
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(API_BASE);

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data = await response.json();

        allTickets = Array.isArray(data) ? data : [];

        renderTickets(allTickets);
        updateDashboardStats(allTickets);

    } catch (error) {
        console.error(
            "Failed to load tickets:",
            error
        );

        allTickets = [];

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        Unable to load tickets.
                        Please check the backend connection.
                    </td>
                </tr>
            `;
        }

        updateDashboardStats([]);
    }
}


/* =========================================================
   RENDER TICKETS
========================================================= */

function renderTickets(tickets) {
    const tableBody =
        document.getElementById("ticketTableBody");

    const emptyState =
        document.getElementById("emptyState");

    if (!tableBody) {
        return;
    }

    if (!tickets || tickets.length === 0) {
        tableBody.innerHTML = "";

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    tableBody.innerHTML = tickets
        .map((ticket) => {

            const statusClass =
                getStatusClass(ticket.status);

            const priority =
                getPriority(ticket);

            const priorityClass =
                getPriorityClass(priority);

            const sla =
                getSLAInfo(ticket);

            return `
                <tr>

                    <td>
                        <span class="ticket-number">
                            ${escapeHTML(ticket.ticket_id)}
                        </span>
                    </td>

                    <td>
                        <div class="customer-name">
                            ${escapeHTML(ticket.customer_name)}
                        </div>

                        <div class="customer-email">
                            ${escapeHTML(ticket.customer_email)}
                        </div>
                    </td>

                    <td>
                        <div class="issue-title">
                            ${escapeHTML(ticket.subject)}
                        </div>

                        <div class="issue-description">
                            ${escapeHTML(ticket.description)}
                        </div>
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(ticket.status)}
                        </span>
                    </td>

                    <td>
                        <span class="priority-badge ${priorityClass}">
                            ${escapeHTML(priority)}
                        </span>
                    </td>

                    <td>
                        <span class="sla-badge ${sla.className}">
                            ${escapeHTML(sla.text)}
                        </span>
                    </td>

                    <td>
                        ${formatDate(ticket.created_at)}
                    </td>

                    <td>
                        <a
                            href="ticket-details.html?id=${encodeURIComponent(ticket.ticket_id)}"
                            class="view-btn"
                        >
                            View
                        </a>
                    </td>

                </tr>
            `;
        })
        .join("");
}


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

function updateDashboardStats(tickets) {

    const totalElement =
        document.getElementById("totalTickets");

    const openElement =
        document.getElementById("openTickets");

    const progressElement =
        document.getElementById("progressTickets");

    const closedElement =
        document.getElementById("closedTickets");

    const overdueElement =
        document.getElementById("overdueTickets");


    const total =
        tickets.length;

    const open =
        tickets.filter(
            ticket => ticket.status === "Open"
        ).length;

    const progress =
        tickets.filter(
            ticket => ticket.status === "In Progress"
        ).length;

    const closed =
        tickets.filter(
            ticket => ticket.status === "Closed"
        ).length;

    const overdue =
        tickets.filter(ticket => {
            const sla = getSLAInfo(ticket);
            return sla.text === "Overdue";
        }).length;


    if (totalElement) {
        totalElement.textContent = total;
    }

    if (openElement) {
        openElement.textContent = open;
    }

    if (progressElement) {
        progressElement.textContent = progress;
    }

    if (closedElement) {
        closedElement.textContent = closed;
    }

    if (overdueElement) {
        overdueElement.textContent = overdue;
    }
}


/* =========================================================
   SEARCH + FILTER
========================================================= */

function applyFilters() {

    const searchInput =
        document.getElementById("searchInput");

    const statusFilter =
        document.getElementById("statusFilter");


    const search =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

    const status =
        statusFilter
            ? statusFilter.value
            : "All";


    const filteredTickets =
        allTickets.filter(ticket => {

            const matchesSearch =
                !search ||
                String(ticket.ticket_id || "")
                    .toLowerCase()
                    .includes(search) ||

                String(ticket.customer_name || "")
                    .toLowerCase()
                    .includes(search) ||

                String(ticket.customer_email || "")
                    .toLowerCase()
                    .includes(search) ||

                String(ticket.subject || "")
                    .toLowerCase()
                    .includes(search) ||

                String(ticket.description || "")
                    .toLowerCase()
                    .includes(search);


            const matchesStatus =
                status === "All" ||
                ticket.status === status;


            return matchesSearch && matchesStatus;
        });


    renderTickets(filteredTickets);
}


/* =========================================================
   CREATE TICKET
========================================================= */

async function createTicket(event) {

    event.preventDefault();


    const customerName =
        document.getElementById("customerName");

    const customerEmail =
        document.getElementById("customerEmail");

    const subject =
        document.getElementById("subject");

    const priority =
        document.getElementById("priority");

    const description =
        document.getElementById("description");


    if (
        !customerName ||
        !customerEmail ||
        !subject ||
        !description
    ) {
        alert("Required form fields are missing.");
        return;
    }


    const customer_name =
        customerName.value.trim();

    const customer_email =
        customerEmail.value.trim();

    const subjectValue =
        subject.value.trim();

    const descriptionValue =
        description.value.trim();


    if (
        !customer_name ||
        !customer_email ||
        !subjectValue ||
        !descriptionValue
    ) {
        alert("Please fill all required fields.");
        return;
    }


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(customer_email)) {
        alert("Please enter a valid email address.");
        return;
    }


    const submitButton =
        document.querySelector(
            "#createTicketForm button[type='submit']"
        );


    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
    }


    try {

        const response =
            await fetch(API_BASE, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    customer_name: customer_name,
                    customer_email: customer_email,
                    subject: subjectValue,
                    description: descriptionValue
                })
            });


        const data =
            await response.json().catch(() => ({}));


        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to create ticket."
            );
        }


        alert(
            `Ticket created successfully!\n\nTicket ID: ${data.ticket_id}`
        );


        window.location.href =
            `ticket-details.html?id=${encodeURIComponent(data.ticket_id)}`;


    } catch (error) {

        console.error(
            "Create ticket error:",
            error
        );

        alert(
            "Ticket could not be created.\n\n" +
            "Please check that the backend is running."
        );

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Create Ticket";
        }
    }
}


/* =========================================================
   GET TICKET ID FROM URL
========================================================= */

function getTicketIdFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("id");
}


/* =========================================================
   LOAD TICKET DETAILS
========================================================= */

async function loadTicketDetails() {

    const ticketId =
        getTicketIdFromURL();


    if (!ticketId) {

        showDetailError(
            "No ticket ID was provided."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/${encodeURIComponent(ticketId)}`
            );


        const data =
            await response.json().catch(() => ({}));


        if (!response.ok) {
            throw new Error(
                data.message ||
                "Ticket not found."
            );
        }


        displayTicketDetails(data);


    } catch (error) {

        console.error(
            "Ticket details error:",
            error
        );

        showDetailError(
            "Unable to load ticket details."
        );
    }
}


/* =========================================================
   DISPLAY TICKET DETAILS
========================================================= */

function displayTicketDetails(ticket) {

    const ticketIdElement =
        document.getElementById("ticketId");

    const customerNameElement =
        document.getElementById("customerName");

    const customerEmailElement =
        document.getElementById("customerEmail");

    const subjectElement =
        document.getElementById("subject");

    const descriptionElement =
        document.getElementById("description");

    const priorityElement =
        document.getElementById("ticketPriority");

    const slaElement =
        document.getElementById("slaStatus");

    const createdAtElement =
        document.getElementById("createdAt");

    const updatedAtElement =
        document.getElementById("updatedAt");

    const statusElement =
        document.getElementById("status");


    if (ticketIdElement) {
        ticketIdElement.textContent =
            ticket.ticket_id || "N/A";
    }


    if (customerNameElement) {
        customerNameElement.textContent =
            ticket.customer_name || "N/A";
    }


    if (customerEmailElement) {
        customerEmailElement.textContent =
            ticket.customer_email || "N/A";
    }


    if (subjectElement) {
        subjectElement.textContent =
            ticket.subject || "N/A";
    }


    if (descriptionElement) {
        descriptionElement.textContent =
            ticket.description || "N/A";
    }


    const priority =
        getPriority(ticket);


    if (priorityElement) {

        priorityElement.innerHTML = `
            <span class="priority-badge ${getPriorityClass(priority)}">
                ${escapeHTML(priority)}
            </span>
        `;
    }


    const sla =
        getSLAInfo(ticket);


    if (slaElement) {

        slaElement.innerHTML = `
            <span class="sla-badge ${sla.className}">
                ${escapeHTML(sla.text)}
            </span>
        `;
    }


    if (createdAtElement) {
        createdAtElement.textContent =
            formatDate(ticket.created_at);
    }


    if (updatedAtElement) {
        updatedAtElement.textContent =
            formatDate(ticket.updated_at);
    }


    if (statusElement) {
        statusElement.value =
            ticket.status || "Open";
    }


    renderNotes(ticket.notes || []);
}


/* =========================================================
   RENDER NOTES
========================================================= */

function renderNotes(notes) {

    const notesContainer =
        document.getElementById("notesContainer");


    if (!notesContainer) {
        return;
    }


    if (!notes || notes.length === 0) {

        notesContainer.innerHTML = `
            <div class="loading-row">
                No notes or comments yet.
            </div>
        `;

        return;
    }


    notesContainer.innerHTML =
        notes.map(note => `
            <div class="note">

                <div class="note-text">
                    ${escapeHTML(note.note_text)}
                </div>

                <div class="note-date">
                    ${formatDate(note.created_at)}
                </div>

            </div>
        `).join("");
}


/* =========================================================
   UPDATE TICKET
========================================================= */

async function updateTicket() {

    const ticketId =
        getTicketIdFromURL();

    const statusElement =
        document.getElementById("status");

    const noteElement =
        document.getElementById("newNote");

    const saveButton =
        document.getElementById("saveChangesBtn");


    if (!ticketId) {
        alert("Ticket ID is missing.");
        return;
    }


    if (!statusElement) {
        alert("Status field is missing.");
        return;
    }


    const status =
        statusElement.value;


    const notes =
        noteElement
            ? noteElement.value.trim()
            : "";


    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/${encodeURIComponent(ticketId)}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: status,
                        notes: notes
                    })
                }
            );


        const data =
            await response.json().catch(() => ({}));


        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to update ticket."
            );
        }


        alert(
            "Ticket updated successfully!"
        );


        if (noteElement) {
            noteElement.value = "";
        }


        await loadTicketDetails();


    } catch (error) {

        console.error(
            "Update ticket error:",
            error
        );

        alert(
            error.message ||
            "Unable to update ticket."
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    }
}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function showDetailError(message) {

    const elements = [
        "ticketId",
        "customerName",
        "customerEmail",
        "subject",
        "description",
        "ticketPriority",
        "slaStatus",
        "createdAt",
        "updatedAt"
    ];


    elements.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = "";
        }
    });


    const ticketIdElement =
        document.getElementById("ticketId");


    if (ticketIdElement) {
        ticketIdElement.textContent =
            message;
    }


    const notesContainer =
        document.getElementById("notesContainer");


    if (notesContainer) {
        notesContainer.innerHTML = `
            <div class="loading-row">
                ${escapeHTML(message)}
            </div>
        `;
    }
}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* ---------------------------------------------
           CREATE TICKET FORM
        --------------------------------------------- */

        const createForm =
            document.getElementById(
                "createTicketForm"
            );


        if (createForm) {
            createForm.addEventListener(
                "submit",
                createTicket
            );
        }


        /* ---------------------------------------------
           DASHBOARD
        --------------------------------------------- */

        const ticketTableBody =
            document.getElementById(
                "ticketTableBody"
            );


        if (ticketTableBody) {

            loadTickets();


            const searchInput =
                document.getElementById(
                    "searchInput"
                );


            const statusFilter =
                document.getElementById(
                    "statusFilter"
                );


            if (searchInput) {
                searchInput.addEventListener(
                    "input",
                    applyFilters
                );
            }


            if (statusFilter) {
                statusFilter.addEventListener(
                    "change",
                    applyFilters
                );
            }
        }


        /* ---------------------------------------------
           TICKET DETAILS
        --------------------------------------------- */

        const ticketIdElement =
            document.getElementById(
                "ticketId"
            );


        if (ticketIdElement) {

            loadTicketDetails();


            const saveButton =
                document.getElementById(
                    "saveChangesBtn"
                );


            if (saveButton) {

                saveButton.addEventListener(
                    "click",
                    updateTicket
                );
            }
        }
    }
);
