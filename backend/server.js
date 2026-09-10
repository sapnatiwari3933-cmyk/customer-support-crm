const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// =====================================================
// Helper: Generate Ticket ID
// =====================================================

function generateTicketId() {
    return `TCK-${Date.now()}`;
}


// =====================================================
// 1. CREATE TICKET
// POST /api/tickets
// =====================================================

app.post("/api/tickets", (req, res) => {

    const {
        customer_name,
        customer_email,
        subject,
        description
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

    const ticketId = generateTicketId();

    const sql = `
        INSERT INTO tickets
        (
            ticket_id,
            customer_name,
            customer_email,
            subject,
            description,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            ticketId,
            customer_name,
            customer_email,
            subject,
            description,
            "Open"
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
                `SELECT created_at FROM tickets WHERE ticket_id = ?`,
                [ticketId],
                (err, row) => {

                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Ticket created but timestamp could not be retrieved."
                        });
                    }

                    res.status(201).json({
                        ticket_id: ticketId,
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
            created_at,
            updated_at
        FROM tickets
        WHERE 1 = 1
    `;

    const params = [];

    // Status filter
    if (status && status !== "All") {
        sql += ` AND status = ?`;
        params.push(status);
    }

    // Search
    if (search) {

        sql += `
            AND (
                customer_name LIKE ?
                OR ticket_id LIKE ?
                OR customer_email LIKE ?
                OR description LIKE ?
                OR subject LIKE ?
            )
        `;

        const searchValue = `%${search}%`;

        params.push(
            searchValue,
            searchValue,
            searchValue,
            searchValue,
            searchValue
        );
    }

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
            created_at,
            updated_at
        FROM tickets
        WHERE ticket_id = ?
    `;

    db.get(ticketSql, [ticket_id], (err, ticket) => {

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

        db.all(notesSql, [ticket_id], (err, notes) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch notes."
                });
            }

            res.json({
                ...ticket,
                notes: notes
            });

        });
    });
});


// =====================================================
// 4. UPDATE TICKET
// PUT /api/tickets/:ticket_id
// Body:
// {
//   "status": "In Progress",
//   "notes": "Customer contacted."
// }
// =====================================================

app.put("/api/tickets/:ticket_id", (req, res) => {

    const { ticket_id } = req.params;
    const { status, notes } = req.body;

    const allowedStatuses = [
        "Open",
        "In Progress",
        "Closed"
    ];

    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid status."
        });
    }

    const updatedAt = new Date().toISOString();

    const updateSql = `
        UPDATE tickets
        SET
            status = ?,
            updated_at = ?
        WHERE ticket_id = ?
    `;

    db.run(
        updateSql,
        [status, updatedAt, ticket_id],
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to update ticket."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Ticket not found."
                });
            }

            // Add note if provided
            if (notes && notes.trim() !== "") {

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
                    [ticket_id, notes.trim()],
                    (err) => {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message: "Ticket updated but note could not be added."
                            });
                        }

                        return res.json({
                            success: true,
                            updated_at: updatedAt
                        });
                    }
                );

            } else {

                return res.json({
                    success: true,
                    updated_at: updatedAt
                });

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
    console.log(`SupportDesk CRM server running on port ${PORT}`);
});
