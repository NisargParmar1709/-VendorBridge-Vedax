from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.execute("CREATE SEQUENCE rfq_number_seq START 1")
    op.execute("CREATE SEQUENCE po_number_seq START 1")
    op.execute("CREATE SEQUENCE inv_number_seq START 1")

    op.create_table(
        "vendors",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("gst_number", sa.String(length=20), nullable=True),
        sa.Column("contact_name", sa.String(length=100), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=False),
        sa.Column("contact_phone", sa.String(length=20), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column(
            "country",
            sa.String(length=100),
            nullable=False,
            server_default=sa.text("'India'"),
        ),
        sa.Column("pincode", sa.String(length=20), nullable=True),
        sa.Column("bank_name", sa.String(length=100), nullable=True),
        sa.Column("bank_account", sa.String(length=50), nullable=True),
        sa.Column("bank_ifsc", sa.String(length=20), nullable=True),
        sa.Column(
            "rating",
            sa.Numeric(precision=3, scale=2),
            nullable=True,
            server_default=sa.text("0.00"),
        ),
        sa.Column(
            "total_orders",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.CheckConstraint(
            "status IN ('active','pending','blocked','inactive')",
            name="ck_vendors_status",
        ),
        sa.UniqueConstraint("gst_number", name="uq_vendors_gst_number"),
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("additional_info", sa.Text(), nullable=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.CheckConstraint(
            "role IN ('admin','procurement_officer','manager','vendor')",
            name="ck_users_role",
        ),
        sa.CheckConstraint(
            "status IN ('active','inactive','pending')",
            name="ck_users_status",
        ),
        sa.ForeignKeyConstraint(
            ["vendor_id"],
            ["vendors.id"],
            name="fk_users_vendor",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "rfqs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rfq_number", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.CheckConstraint(
            "status IN ('draft','published','under_review','comparison','approval_pending','approved','rejected','expired','closed')",
            name="ck_rfqs_status",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.UniqueConstraint("rfq_number", name="uq_rfqs_rfq_number"),
    )

    op.create_table(
        "rfq_line_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rfq_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "rfq_vendor_assignments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rfq_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "invited_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "notified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.UniqueConstraint("rfq_id", "vendor_id", name="uq_rfq_vendor_assignments_rfq_vendor"),
    )

    op.create_table(
        "rfq_attachments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rfq_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
    )

    op.create_table(
        "quotations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rfq_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column(
            "gst_percentage",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default=sa.text("18.00"),
        ),
        sa.Column(
            "subtotal",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "tax_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "grand_total",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("delivery_days", sa.Integer(), nullable=True),
        sa.Column("payment_terms", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "currency",
            sa.String(length=10),
            nullable=False,
            server_default=sa.text("'INR'"),
        ),
        sa.Column(
            "exchange_rate",
            sa.Numeric(precision=15, scale=6),
            nullable=False,
            server_default=sa.text("1.000000"),
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "status IN ('draft','submitted','selected','rejected')",
            name="ck_quotations_status",
        ),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"]),
        sa.UniqueConstraint("rfq_id", "vendor_id", name="uq_quotations_rfq_vendor"),
    )

    op.create_table(
        "quotation_line_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("quotation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rfq_line_item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("unit_price", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("total_price", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.ForeignKeyConstraint(["quotation_id"], ["quotations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rfq_line_item_id"], ["rfq_line_items.id"]),
    )

    op.create_table(
        "approvals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rfq_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quotation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("l1_approver_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("l2_approver_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "l1_status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "l2_status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("l1_remarks", sa.Text(), nullable=True),
        sa.Column("l2_remarks", sa.Text(), nullable=True),
        sa.Column("l1_actioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("l2_actioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "overall_status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "l1_status IN ('pending','approved','rejected')",
            name="ck_approvals_l1_status",
        ),
        sa.CheckConstraint(
            "l2_status IN ('pending','approved','rejected','skipped')",
            name="ck_approvals_l2_status",
        ),
        sa.CheckConstraint(
            "overall_status IN ('pending','approved','rejected')",
            name="ck_approvals_overall_status",
        ),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"]),
        sa.ForeignKeyConstraint(["quotation_id"], ["quotations.id"]),
        sa.ForeignKeyConstraint(["l1_approver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["l2_approver_id"], ["users.id"]),
    )

    op.create_table(
        "purchase_orders",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("po_number", sa.String(length=30), nullable=False),
        sa.Column("rfq_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quotation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("approval_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bill_to_name", sa.String(length=255), nullable=True),
        sa.Column("bill_to_address", sa.Text(), nullable=True),
        sa.Column("bill_to_gstin", sa.String(length=20), nullable=True),
        sa.Column("subtotal", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "cgst_percentage",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default=sa.text("9.00"),
        ),
        sa.Column(
            "sgst_percentage",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default=sa.text("9.00"),
        ),
        sa.Column(
            "igst_percentage",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default=sa.text("0.00"),
        ),
        sa.Column(
            "cgst_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "sgst_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "igst_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("grand_total", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "currency",
            sa.String(length=10),
            nullable=False,
            server_default=sa.text("'INR'"),
        ),
        sa.Column(
            "exchange_rate",
            sa.Numeric(precision=15, scale=6),
            nullable=False,
            server_default=sa.text("1.000000"),
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column(
            "po_date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
        sa.Column("delivery_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "status IN ('draft','sent','acknowledged','completed','cancelled')",
            name="ck_purchase_orders_status",
        ),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"]),
        sa.ForeignKeyConstraint(["quotation_id"], ["quotations.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.ForeignKeyConstraint(["approval_id"], ["approvals.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.UniqueConstraint("po_number", name="uq_purchase_orders_po_number"),
    )

    op.create_table(
        "invoices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("invoice_number", sa.String(length=30), nullable=False),
        sa.Column("po_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "invoice_date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("subtotal", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "cgst_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "sgst_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "igst_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("grand_total", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "currency",
            sa.String(length=10),
            nullable=False,
            server_default=sa.text("'INR'"),
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_sent_to", sa.String(length=255), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "status IN ('draft','sent','paid','overdue','voided')",
            name="ck_invoices_status",
        ),
        sa.ForeignKeyConstraint(["po_id"], ["purchase_orders.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.UniqueConstraint("invoice_number", name="uq_invoices_invoice_number"),
    )

    op.create_table(
        "activity_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_role", sa.String(length=30), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
    )
    op.create_index(
        "idx_activity_logs_entity",
        "activity_logs",
        ["entity_type", "entity_id"],
        unique=False,
    )
    op.create_index(
        "idx_activity_logs_actor",
        "activity_logs",
        ["actor_id"],
        unique=False,
    )
    op.create_index(
        "idx_activity_logs_created",
        "activity_logs",
        [sa.text("created_at DESC")],
        unique=False,
    )

    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "type IN ('info','success','warning','error')",
            name="ck_notifications_type",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index(
        "idx_notifications_user",
        "notifications",
        ["user_id", "is_read", sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_notifications_user", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("idx_activity_logs_created", table_name="activity_logs")
    op.drop_index("idx_activity_logs_actor", table_name="activity_logs")
    op.drop_index("idx_activity_logs_entity", table_name="activity_logs")
    op.drop_table("activity_logs")

    op.drop_table("invoices")
    op.drop_table("purchase_orders")
    op.drop_table("approvals")
    op.drop_table("quotation_line_items")
    op.drop_table("quotations")
    op.drop_table("rfq_attachments")
    op.drop_table("rfq_vendor_assignments")
    op.drop_table("rfq_line_items")
    op.drop_table("rfqs")
    op.drop_table("users")
    op.drop_table("vendors")

    op.execute("DROP SEQUENCE IF EXISTS inv_number_seq")
    op.execute("DROP SEQUENCE IF EXISTS po_number_seq")
    op.execute("DROP SEQUENCE IF EXISTS rfq_number_seq")