"use strict";

/* =========================================================
   SUPPORT CRM - FRONTEND JAVASCRIPT
========================================================= */

const API_BASE = "http://localhost:5000/api/tickets";

let tickets = [];


/* =========================================================
   SAMPLE TICKETS
   Used until backend/database is connected
========================================================= */

const sampleTickets = [
    {
        ticket_id: "TCK-1001",
        customer_name: "Rahul Sharma",
        customer_email: "rahul@example.com",
        subject: "Payment failed",
        description: "Customer is unable to complete the payment.",
        status: "Open",
        priority: "High",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        notes: []
    },
    {
        ticket_id: "TCK-1002",
        customer_name: "Priya Singh",
        customer_email: "priya@example.com",
        subject: "Unable to login",
        description: "Customer cannot login to the account.",
        status: "In Progress",
        priority: "Medium",
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        notes: []
    },
    {
        ticket_id: "TCK-1003",
        customer_name: "Amit Verma",
        customer_email: "amit@example.com",
        subject: "Refund not received",
        description: "Customer has not received the expected refund.",
        status: "Closed",
        priority: "Low",
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        notes: []
    }
];


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("ticketTableBody")) {
        loadTickets();
    }

    if (document.getElementById("createTicketForm")) {
        setupCreateTicketForm();
    }

    if (document.getElementById("saveChangesBtn")) {
        loadTicketDetails();
    }

    setupSearchAndFilters();
});


/* =========================================================
   LOAD TICKETS
========================================================= */

async function loadTickets() {

    try {

        const response = await fetch(API_BASE);

        if (!response.ok) {
            throw new Error("Backend unavailable");
        }

        const data = await response.json();

        tickets = Array.isArray(data) ? data : data.tickets || [];

    } catch (error) {

        console.log("Using sample tickets until backend is connected.");

        tickets = [...sampleTickets];
    }

    renderTickets(tickets);
    updateDashboardStats(tickets);
}


/* =========================================================
   RENDER TICKETS
========================================================= */

function renderTickets(ticketList) {

    const tableBody = document.getElementById("ticketTableBody");

    if (!tableBody) {
        return;
    }

    if (ticketList.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">

                    <div class="empty-icon">▣</div>

                    <h3>No tickets found</h3>

                    <p>
                        Try changing your search or filter.
                    </p>

                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML = ticketList.map(ticket => {

        const sla = calculateSLA(ticket);

        return `
            <tr>

                <td>
                    <strong>${escapeHTML(ticket.ticket_id)}</strong>
                </td>

                <td>
                    <strong>${escapeHTML(ticket.customer_name)}</strong>
                    <br>
                    <small>${escapeHTML(ticket.customer_email)}</small>
                </td>

                <td>
                    ${escapeHTML(ticket.subject)}
                </td>

                <td>
                    <span class="status-badge ${getStatusClass(ticket.status)}">
                        ${escapeHTML(ticket.status)}
                    </span>
                </td>

                <td>
                    <span class="priority-badge ${getPriorityClass(ticket.priority)}">
                        ${escapeHTML(ticket.priority || "Medium")}
                    </span>
                </td>

                <td>
                    <span class="sla-badge ${sla.overdue ? "overdue" : ""}">
                        ${sla.overdue ? "Overdue" : "Within SLA"}
                    </span>
                </td>

                <td>
                    ${formatDate(ticket.created_at)}
                </td>

                <td>
                    <a
                        href="ticket-details.html?id=${encodeURIComponent(ticket.ticket_id)}"
                        class="secondary-btn"
                    >
                        View
                    </a>
                </td>

            </tr>
        `;

    }).join("");
}


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

function updateDashboardStats(ticketList) {

    const total = ticketList.length;

    const open = ticketList.filter(
        ticket => ticket.status === "Open"
    ).length;

    const progress = ticketList.filter(
        ticket => ticket.status === "In Progress"
    ).length;

    const closed = ticketList.filter(
        ticket => ticket.status === "Closed"
    ).length;

    const overdue = ticketList.filter(
        ticket => calculateSLA(ticket).overdue
    ).length;


    setText("totalTickets", total);
    setText("openTickets", open);
    setText("progressTickets", progress);
    setText("closedTickets", closed);
    setText("overdueTickets", overdue);
}


/* =========================================================
   SEARCH & FILTER
========================================================= */

function setupSearchAndFilters() {

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const priorityFilter = document.getElementById("priorityFilter");


    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", applyFilters);
    }

    if (priorityFilter) {
        priorityFilter.addEventListener("change", applyFilters);
    }
}


function applyFilters() {

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const priorityFilter = document.getElementById("priorityFilter");


    const search = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const status = statusFilter
        ? statusFilter.value
        : "All";

    const priority = priorityFilter
        ? priorityFilter.value
        : "All";


    const filtered = tickets.filter(ticket => {

        const searchableText = `
            ${ticket.ticket_id}
            ${ticket.customer_name}
            ${ticket.customer_email}
            ${ticket.subject}
            ${ticket.description}
        `.toLowerCase();


        const matchesSearch =
            !search ||
            searchableText.includes(search);


        const matchesStatus =
            status === "All" ||
            ticket.status === status;


        const matchesPriority =
            priority === "All" ||
            (ticket.priority || "Medium") === priority;


        return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
        );
    });


    renderTickets(filtered);
}


/* =========================================================
   SLA SYSTEM
========================================================= */

/*
   SLA rules:

   High   = 4 hours
   Medium = 8 hours
   Low    = 24 hours

   Closed tickets are never considered overdue.
*/

function calculateSLA(ticket) {

    if (ticket.status === "Closed") {

        return {
            overdue: false,
            remaining: "Closed"
        };
    }


    const createdTime = new Date(ticket.created_at).getTime();

    const now = Date.now();

    const priority = ticket.priority || "Medium";


    let slaHours = 8;


    if (priority === "High") {
        slaHours = 4;
    }

    if (priority === "Low") {
        slaHours = 24;
    }


    const deadline =
        createdTime + slaHours * 60 * 60 * 1000;


    const remaining =
        deadline - now;


    return {
        overdue: remaining < 0,
        remaining: remaining
    };
}


/* =========================================================
   CREATE TICKET
========================================================= */

function setupCreateTicketForm() {

    const form = document.getElementById("createTicketForm");

    if (!form) {
        return;
    }


    form.addEventListener("submit", async event => {

        event.preventDefault();


        const customerName =
            document.getElementById("customerName").value.trim();

        const customerEmail =
            document.getElementById("customerEmail").value.trim();

        const subject =
            document.getElementById("subject").value.trim();

        const priority =
            document.getElementById("priority").value;

        const description =
            document.getElementById("description").value.trim();


        const ticketData = {

            customer_name: customerName,

            customer_email: customerEmail,

            subject: subject,

            description: description,

            priority: priority

        };


        try {

            const response = await fetch(API_BASE, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(ticketData)

            });


            if (!response.ok) {
                throw new Error("Unable to create ticket");
            }


            alert("Ticket created successfully!");

            window.location.href = "index.html";


        } catch (error) {

            /*
               Demo mode:
               Save ticket locally until backend is available.
            */

            const newTicket = {

                ticket_id:
                    "TCK-" +
                    Math.floor(1000 + Math.random() * 9000),

                customer_name: customerName,

                customer_email: customerEmail,

                subject: subject,

                description: description,

                status: "Open",

                priority: priority,

                created_at: new Date().toISOString(),

                updated_at: new Date().toISOString(),

                notes: []

            };


            const storedTickets =
                JSON.parse(
                    localStorage.getItem("crmTickets") || "[]"
                );


            storedTickets.push(newTicket);


            localStorage.setItem(
                "crmTickets",
                JSON.stringify(storedTickets)
            );


            alert(
                "Ticket created successfully in demo mode!"
            );

            window.location.href = "index.html";
        }

    });
}


/* =========================================================
   LOAD TICKET DETAILS
========================================================= */

async function loadTicketDetails() {

    const params = new URLSearchParams(
        window.location.search
    );

    const ticketId = params.get("id");


    if (!ticketId) {
        return;
    }


    let ticket = null;


    try {

        const response =
            await fetch(
                `${API_BASE}/${encodeURIComponent(ticketId)}`
            );


        if (!response.ok) {
            throw new Error("Ticket not found");
        }


        ticket = await response.json();

    } catch (error) {

        const allTickets = [
            ...sampleTickets,
            ...JSON.parse(
                localStorage.getItem("crmTickets") || "[]"
            )
        ];


        ticket = allTickets.find(
            item => item.ticket_id === ticketId
        );
    }


    if (!ticket) {

        alert("Ticket not found.");

        window.location.href = "index.html";

        return;
    }


    displayTicketDetails(ticket);
}


/* =========================================================
   DISPLAY TICKET DETAILS
========================================================= */

function displayTicketDetails(ticket) {

    setText("ticketId", ticket.ticket_id);

    setText("customerName", ticket.customer_name);

    setText("customerEmail", ticket.customer_email);

    setText("subject", ticket.subject);

    setText("description", ticket.description);

    setText("createdAt", formatDate(ticket.created_at));

    setText("updatedAt", formatDate(ticket.updated_at));


    const statusSelect =
        document.getElementById("status");


    if (statusSelect) {
        statusSelect.value =
            ticket.status || "Open";
    }


    const priorityElement =
        document.getElementById("ticketPriority");


    if (priorityElement) {

        const priority =
            ticket.priority || "Medium";

        priorityElement.textContent = priority;

        priorityElement.className =
            `priority-badge ${getPriorityClass(priority)}`;
    }


    const slaElement =
        document.getElementById("slaStatus");


    if (slaElement) {

        const sla = calculateSLA(ticket);

        slaElement.textContent =
            sla.overdue
                ? "Overdue"
                : "Within SLA";

        slaElement.className =
            `sla-badge ${sla.overdue ? "overdue" : ""}`;
    }


    renderNotes(ticket.notes || []);


    const saveButton =
        document.getElementById("saveChangesBtn");


    if (saveButton) {

        saveButton.onclick = () =>
            saveTicketChanges(ticket);
    }
}


/* =========================================================
   SAVE TICKET CHANGES
========================================================= */

async function saveTicketChanges(ticket) {

    const status =
        document.getElementById("status").value;

    const note =
        document.getElementById("newNote").value.trim();


    const updateData = {

        status: status,

        notes: note

    };


    try {

        const response =
            await fetch(
                `${API_BASE}/${encodeURIComponent(ticket.ticket_id)}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(updateData)
                }
            );


        if (!response.ok) {
            throw new Error("Backend unavailable");
        }


        alert("Ticket updated successfully!");

        location.reload();


    } catch (error) {

        /*
           Demo mode
        */

        ticket.status = status;

        ticket.updated_at =
            new Date().toISOString();


        if (note) {

            ticket.notes =
                ticket.notes || [];

            ticket.notes.push({

                note_text: note,

                created_at:
                    new Date().toISOString()

            });
        }


        updateLocalTicket(ticket);


        alert(
            "Ticket updated successfully in demo mode!"
        );

        location.reload();
    }
}


/* =========================================================
   NOTES
========================================================= */

function renderNotes(notes) {

    const container =
        document.getElementById("notesContainer");


    if (!container) {
        return;
    }


    if (!notes || notes.length === 0) {

        container.innerHTML = `
            <div class="empty-notes">
                No notes added yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        notes.map(note => `

            <div class="note">

                <p>
                    ${escapeHTML(
                        note.note_text || ""
                    )}
                </p>

                <small>
                    ${formatDate(note.created_at)}
                </small>

            </div>

        `).join("");
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function updateLocalTicket(ticket) {

    const storedTickets =
        JSON.parse(
            localStorage.getItem("crmTickets") || "[]"
        );


    const index =
        storedTickets.findIndex(
            item =>
                item.ticket_id === ticket.ticket_id
        );


    if (index !== -1) {

        storedTickets[index] = ticket;

    } else {

        storedTickets.push(ticket);
    }


    localStorage.setItem(
        "crmTickets",
        JSON.stringify(storedTickets)
    );
}


/* =========================================================
   HELPERS
========================================================= */

function getStatusClass(status) {

    if (status === "In Progress") {
        return "progress";
    }

    if (status === "Closed") {
        return "closed";
    }

    return "open";
}


function getPriorityClass(priority) {

    if (priority === "High") {
        return "high";
    }

    if (priority === "Low") {
        return "low";
    }

    return "medium";
}


function formatDate(date) {

    if (!date) {
        return "-";
    }


    const parsedDate = new Date(date);


    if (Number.isNaN(parsedDate.getTime())) {
        return "-";
    }


    return parsedDate.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value ?? "-";
    }
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      }
