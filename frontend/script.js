/* =========================================================
   SUPPORTDESK CRM
   MAIN JAVASCRIPT
========================================================= */

"use strict";


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE = "http://localhost:5000/api/tickets";


/* =========================================================
   LOCAL STORAGE
   Temporary frontend storage until backend is connected
========================================================= */

const STORAGE_KEY = "supportdesk_tickets";


/* =========================================================
   SAMPLE TICKETS
========================================================= */

const sampleTickets = [
    {
        ticket_id: "TCK-1001",
        customer_name: "Rahul Sharma",
        customer_email: "rahul@example.com",
        subject: "Payment failed",
        description: "Customer is unable to complete payment.",
        priority: "High",
        status: "Open",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        notes: []
    },

    {
        ticket_id: "TCK-1002",
        customer_name: "Priya Singh",
        customer_email: "priya@example.com",
        subject: "Unable to login",
        description: "Customer cannot login to the account.",
        priority: "Medium",
        status: "In Progress",
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        notes: [
            {
                note_text: "Support team is checking the account.",
                created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            }
        ]
    },

    {
        ticket_id: "TCK-1003",
        customer_name: "Amit Verma",
        customer_email: "amit@example.com",
        subject: "Refund not received",
        description: "Customer has not received the expected refund.",
        priority: "Low",
        status: "Closed",
        created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        notes: [
            {
                note_text: "Refund was successfully processed.",
                created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
            }
        ]
    }
];


/* =========================================================
   SLA RULES
========================================================= */

const SLA_HOURS = {
    High: 4,
    Medium: 8,
    Low: 24
};


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getStoredTickets() {

    try {

        const data = localStorage.getItem(STORAGE_KEY);

        if (!data) {
            return [];
        }

        return JSON.parse(data);

    } catch (error) {

        console.error("Local storage error:", error);

        return [];
    }
}


function saveStoredTickets(tickets) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tickets)
    );
}


function getAllLocalTickets() {

    const stored = getStoredTickets();

    if (stored.length === 0) {

        saveStoredTickets(sampleTickets);

        return [...sampleTickets];
    }

    return stored;
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


function formatDate(dateValue) {

    if (!dateValue) {
        return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function generateTicketId() {

    const tickets = getAllLocalTickets();

    let highestNumber = 1000;

    tickets.forEach(ticket => {

        const match = String(ticket.ticket_id || "")
            .match(/TCK-(\d+)/);

        if (match) {

            const number = Number(match[1]);

            if (number > highestNumber) {
                highestNumber = number;
            }
        }
    });

    return `TCK-${highestNumber + 1}`;
}


function getSLAInfo(ticket) {

    if (!ticket) {
        return {
            label: "Unknown",
            className: "sla-warning"
        };
    }

    if (ticket.status === "Closed") {

        return {
            label: "Resolved",
            className: "sla-ok"
        };
    }

    const priority = ticket.priority || "Medium";

    const slaHours = SLA_HOURS[priority] || 8;

    const created = new Date(ticket.created_at);

    const deadline =
        created.getTime() +
        slaHours * 60 * 60 * 1000;

    const now = Date.now();

    const remaining =
        deadline - now;

    if (remaining <= 0) {

        return {
            label: "Overdue",
            className: "sla-overdue"
        };
    }

    const hoursLeft =
        Math.floor(remaining / (60 * 60 * 1000));

    if (hoursLeft < 2) {

        return {
            label: `${hoursLeft}h left`,
            className: "sla-warning"
        };
    }

    return {
        label: `${hoursLeft}h left`,
        className: "sla-ok"
    };
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

    if (priority === "Medium") {
        return "priority-medium";
    }

    if (priority === "Low") {
        return "priority-low";
    }

    return "priority-medium";
}


/* =========================================================
   LOAD TICKETS
========================================================= */

async function loadTickets() {

    let tickets = [];

    try {

        const response = await fetch(API_BASE);

        if (!response.ok) {
            throw new Error("API unavailable");
        }

        tickets = await response.json();

        if (!Array.isArray(tickets)) {
            tickets = [];
        }

        /*
         * Keep local tickets too.
         * This prevents tickets created in the browser
         * from disappearing when API data is loaded.
         */

        const localTickets = getStoredTickets();

        const combined = [
            ...tickets,
            ...localTickets
        ];

        const uniqueTickets = [];

        const ids = new Set();

        combined.forEach(ticket => {

            if (!ticket.ticket_id) {
                return;
            }

            if (!ids.has(ticket.ticket_id)) {

                ids.add(ticket.ticket_id);

                uniqueTickets.push(ticket);
            }
        });

        tickets = uniqueTickets;

    } catch (error) {

        console.log(
            "Backend unavailable. Using local data."
        );

        tickets = getAllLocalTickets();
    }

    renderTickets(tickets);
    updateStats(tickets);
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

    tableBody.innerHTML = "";


    if (!tickets || tickets.length === 0) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;
    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    tickets.forEach(ticket => {

        const row =
            document.createElement("tr");

        const sla =
            getSLAInfo(ticket);

        const statusClass =
            getStatusClass(ticket.status);

        const priorityClass =
            getPriorityClass(ticket.priority);


        row.innerHTML = `

            <td>
                <div class="ticket-number">
                    ${escapeHTML(ticket.ticket_id)}
                </div>
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

                <span class="priority-badge ${priorityClass}">
                    ${escapeHTML(ticket.priority || "Medium")}
                </span>

            </td>


            <td>

                <span class="status-badge ${statusClass}">
                    ${escapeHTML(ticket.status || "Open")}
                </span>

            </td>


            <td>

                <span class="sla-badge ${sla.className}">
                    ${escapeHTML(sla.label)}
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

        `;


        tableBody.appendChild(row);
    });
}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateStats(tickets) {

    const total =
        document.getElementById("totalTickets");

    const open =
        document.getElementById("openTickets");

    const progress =
        document.getElementById("progressTickets");

    const closed =
        document.getElementById("closedTickets");

    const overdue =
        document.getElementById("overdueTickets");


    if (!total) {
        return;
    }


    const allTickets =
        Array.isArray(tickets)
            ? tickets
            : [];


    const openCount =
        allTickets.filter(
            ticket => ticket.status === "Open"
        ).length;


    const progressCount =
        allTickets.filter(
            ticket => ticket.status === "In Progress"
        ).length;


    const closedCount =
        allTickets.filter(
            ticket => ticket.status === "Closed"
        ).length;


    const overdueCount =
        allTickets.filter(
            ticket =>
                getSLAInfo(ticket).label === "Overdue"
        ).length;


    total.textContent =
        allTickets.length;

    open.textContent =
        openCount;

    progress.textContent =
        progressCount;

    closed.textContent =
        closedCount;

    if (overdue) {
        overdue.textContent =
            overdueCount;
    }
}


/* =========================================================
   FILTER + SEARCH
========================================================= */

function applyFilters() {

    const searchInput =
        document.getElementById("searchInput");

    const statusFilter =
        document.getElementById("statusFilter");

    const priorityFilter =
        document.getElementById("priorityFilter");


    if (!searchInput) {
        return;
    }


    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const status =
        statusFilter
            ? statusFilter.value
            : "All";


    const priority =
        priorityFilter
            ? priorityFilter.value
            : "All";


    const tickets =
        getAllLocalTickets();


    const filtered =
        tickets.filter(ticket => {

            const searchableText = [

                ticket.ticket_id,

                ticket.customer_name,

                ticket.customer_email,

                ticket.subject,

                ticket.description

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchableText.includes(search);


            const matchesStatus =
                status === "All" ||
                ticket.status === status;


            const matchesPriority =
                priority === "All" ||
                ticket.priority === priority;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesPriority
            );
        });


    renderTickets(filtered);

    updateStats(tickets);
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
        !priority ||
        !description
    ) {
        return;
    }


    const now =
        new Date().toISOString();


    const newTicket = {

        ticket_id: generateTicketId(),

        customer_name:
            customerName.value.trim(),

        customer_email:
            customerEmail.value.trim(),

        subject:
            subject.value.trim(),

        description:
            description.value.trim(),

        priority:
            priority.value,

        status:
            "Open",

        created_at:
            now,

        updated_at:
            now,

        notes: []
    };


    if (
        !newTicket.customer_name ||
        !newTicket.customer_email ||
        !newTicket.subject ||
        !newTicket.description
    ) {

        alert(
            "Please fill all required fields."
        );

        return;
    }


    try {

        const response =
            await fetch(API_BASE, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    customer_name:
                        newTicket.customer_name,

                    customer_email:
                        newTicket.customer_email,

                    subject:
                        newTicket.subject,

                    description:
                        newTicket.description,

                    priority:
                        newTicket.priority

                })
            });


        if (response.ok) {

            const result =
                await response.json();

            const ticketId =
                result.ticket_id ||
                newTicket.ticket_id;


            alert(
                `Ticket ${ticketId} created successfully!`
            );


            window.location.href =
                `ticket-details.html?id=${encodeURIComponent(ticketId)}`;

            return;
        }

    } catch (error) {

        console.log(
            "Backend unavailable. Saving locally."
        );
    }


    /*
     * Local fallback
     */

    const tickets =
        getAllLocalTickets();


    tickets.unshift(newTicket);


    saveStoredTickets(tickets);


    alert(
        `Ticket ${newTicket.ticket_id} created successfully!`
    );


    window.location.href =
        `ticket-details.html?id=${encodeURIComponent(newTicket.ticket_id)}`;
}


/* =========================================================
   GET SINGLE TICKET
========================================================= */

async function getTicket(ticketId) {

    try {

        const response =
            await fetch(
                `${API_BASE}/${encodeURIComponent(ticketId)}`
            );


        if (response.ok) {

            const ticket =
                await response.json();

            return ticket;
        }

    } catch (error) {

        console.log(
            "Backend unavailable."
        );
    }


    const tickets =
        getAllLocalTickets();


    return tickets.find(
        ticket =>
            ticket.ticket_id === ticketId
    );
}


/* =========================================================
   RENDER TICKET DETAILS
========================================================= */

async function loadTicketDetails() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const ticketId =
        params.get("id");


    if (!ticketId) {

        alert("Ticket ID is missing.");

        window.location.href =
            "index.html";

        return;
    }


    const ticket =
        await getTicket(ticketId);


    if (!ticket) {

        document.title =
            "Ticket Not Found";

        const ticketIdElement =
            document.getElementById("ticketId");

        if (ticketIdElement) {
            ticketIdElement.textContent =
                "Ticket not found";
        }

        return;
    }


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

    const statusElement =
        document.getElementById("status");

    const createdAtElement =
        document.getElementById("createdAt");

    const updatedAtElement =
        document.getElementById("updatedAt");


    if (ticketIdElement) {
        ticketIdElement.textContent =
            ticket.ticket_id;
    }

    if (customerNameElement) {
        customerNameElement.textContent =
            ticket.customer_name;
    }

    if (customerEmailElement) {
        customerEmailElement.textContent =
            ticket.customer_email;
    }

    if (subjectElement) {
        subjectElement.textContent =
            ticket.subject;
    }

    if (descriptionElement) {
        descriptionElement.textContent =
            ticket.description;
    }

    if (priorityElement) {

        priorityElement.innerHTML = `

            <span class="priority-badge ${getPriorityClass(ticket.priority)}">
                ${escapeHTML(ticket.priority || "Medium")}
            </span>

        `;
    }


    if (slaElement) {

        const sla =
            getSLAInfo(ticket);


        slaElement.innerHTML = `

            <span class="sla-badge ${sla.className}">
                ${escapeHTML(sla.label)}
            </span>

        `;
    }


    if (statusElement) {

        statusElement.value =
            ticket.status || "Open";
    }


    if (createdAtElement) {

        createdAtElement.textContent =
     
