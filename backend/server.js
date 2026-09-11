const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// HELPERS
// =====================================================

function generateTicketId() {
    return `TCK-${Date.now()}`;
}

const allowedStatuses = [
    "Open",
    "In Progress",
    "Closed"
];

const allowedPriorities = [
    "Low",
    "Medium",
    "High",
    "Urgent"
];


// =====================================================
// 1. CREATE TICKET
// POST /api/tickets
// =====================================================

app.post("/api/tickets", (req, res) => {

    const {
        customer_name,
        customer_email,
        subject,
        description,
        priority
    } = req.body;

    if (
        !customer_name ||
        !customer_email ||
        !subject ||
        !description
    ) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const selectedPriority =
        priority && allowedPriorities.includes(priority)
            ? priority
            : "Medium";

    const ticketId = generateTicketId();

    const sql = `
        INSERT INTO tickets
        (
            ticket_id,
            customer_name,
            customer_email,
            subject,
            description,
            status,
            priority
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            ticketId,
            customer_name.trim(),
            customer_email.trim(),
            subject.trim(),
            description.trim(),
            "Open",
            selectedPriority
        ],
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to create ticket."
                });
            }

            db.get(
                `
                SELECT
                    ticket_id,
                    created_at
                FROM tickets
                WHERE ticket_id = ?
                `,
                [ticketId],
                (err, row) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message: "Ticket created but timestamp could not be retrieved."
                        });
                    }

                    res.status(201).json({
                        success: true,
                        ticket_id: row.ticket_id,
                        created_at: row.created_at
                    });

                }
            );
        }
    );
});


// =====================================================
// 2. GET ALL TICKETS
// GET /api/tickets
//
// Optional:
// ?status=Open
// ?search=Rahul
// =====================================================

app.get("/api/tickets", (req, res) => {

    const { status, search } = req.query;

    let sql = `
        SELECT
            ticket_id,
            customer_name,
            customer_email,
            subject,
            description,
            status,
            priority,
            created_at,
            updated_at
        FROM tickets
        WHERE 1 = 1
    `;

    const params = [];

    // =================================================
    // STATUS FILTER
    // =================================================

    if (status && status !== "All") {

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status filter."
            });
        }

        sql += ` AND status = ?`;
        params.push(status);
    }


    // =================================================
    // SEARCH
    // =================================================

    if (search && search.trim() !== "") {

        sql += `
            AND (
                customer_name LIKE ?
                OR ticket_id LIKE ?
                OR customer_email LIKE ?
                OR description LIKE ?
                OR subject LIKE ?
            )
        `;

        const searchValue = `%${search.trim()}%`;

        params.push(
            searchValue,
            searchValue,
            searchValue,
            searchValue,
            searchValue
        );
    }


    // Newest first
    sql += ` ORDER BY created_at DESC`;


    db.all(sql, params, (err, rows) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch tickets."
            });
        }

        res.json(rows);
    });
});


// =====================================================
// 3. GET SINGLE TICKET + NOTES
// GET /api/tickets/:ticket_id
// =====================================================

app.get("/api/tickets/:ticket_id", (req, res) => {

    const { ticket_id } = req.params;

    const ticketSql = `
        SELECT
            ticket_id,
            customer_name,
            customer_email,
            subject,
            description,
            status,
            priority,
            created_at,
            updated_at
        FROM tickets
        WHERE ticket_id = ?
    `;

    db.get(
        ticketSql,
        [ticket_id],
        (err, ticket) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch ticket."
                });
            }

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: "Ticket not found."
                });
            }


            // =========================================
            // GET NOTES
            // =========================================

            const notesSql = `
                SELECT
                    id,
                    ticket_id,
                    note_text,
                    created_at
                FROM notes
                WHERE ticket_id = ?
                ORDER BY created_at DESC
            `;

            db.all(
                notesSql,
                [ticket_id],
                (err, notes) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            message: "Failed to fetch notes."
                        });
                    }

                    res.json({
                        ...ticket,
                        notes: notes || []
                    });

                }
            );
        }
    );
});


// =====================================================
// 4. UPDATE TICKET
// PUT /api/tickets/:ticket_id
//
// Body:
// {
//   "status": "In Progress",
//   "priority": "High",
//   "notes": "Customer contacted."
// }
// =====================================================

app.put("/api/tickets/:ticket_id", (req, res) => {

    const { ticket_id } = req.params;

    const {
        status,
        priority,
        notes
    } = req.body;


    // =================================================
    // VALIDATE STATUS
    // =================================================

    if (!status || !allowedStatuses.includes(status)) {

        return res.status(400).json({
            success: false,
            message: "Invalid status."
        });
    }


    // =================================================
    // VALIDATE PRIORITY
    // =================================================

    const selectedPriority =
        priority && allowedPriorities.includes(priority)
            ? priority
            : null;


    // =================================================
    // UPDATE TICKET
    // =================================================

    let updateSql;
    let updateParams;

    if (selectedPriority) {

        updateSql = `
            UPDATE tickets
            SET
                status = ?,
                priority = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
        `;

        updateParams = [
            status,
            selectedPriority,
            ticket_id
        ];

    } else {

        updateSql = `
            UPDATE tickets
            SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
        `;

        updateParams = [
            status,
            ticket_id
        ];
    }


    db.run(
        updateSql,
        updateParams,
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to update ticket."
                });
            }


            // Ticket doesn't exist
            if (this.changes === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Ticket not found."
                });
            }


            // =========================================
            // ADD NOTE
            // =========================================

            if (
                notes &&
                typeof notes === "string" &&
                notes.trim() !== ""
            ) {

                const noteSql = `
                    INSERT INTO notes
                    (
                        ticket_id,
                        note_text
                    )
                    VALUES (?, ?)
                `;

                db.run(
                    noteSql,
                    [
                        ticket_id,
                        notes.trim()
                    ],
                    (err) => {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message: "Ticket updated but note could not be added."
                            });
                        }

                        return getUpdatedTicket();
                    }
                );

            } else {

                return getUpdatedTicket();
            }


            // =========================================
            // RETURN UPDATED TIMESTAMP
            // =========================================

            function getUpdatedTicket() {

                db.get(
                    `
                    SELECT
                        updated_at
                    FROM tickets
                    WHERE ticket_id = ?
                    `,
                    [ticket_id],
                    (err, row) => {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message: "Ticket updated but timestamp could not be retrieved."
                            });
                        }

                        return res.json({
                            success: true,
                            updated_at: row.updated_at
                        });

                    }
                );
            }

        }
    );
});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "SupportDesk CRM API is running."
    });

});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log(
        `SupportDesk CRM server running on port ${PORT}`
    );

});
