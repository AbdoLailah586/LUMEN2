"""initial migration

Revision ID: 0001
Revises: 
Create Date: 2026-03-06 23:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # CREATE USERS TABLE
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # CREATE DATASETS TABLE
    op.create_table(
        'datasets',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('file_type', sa.String(length=50), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('column_count', sa.Integer(), nullable=True),
        sa.Column('storage_path', sa.String(length=500), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )

    # CREATE JOBS TABLE
    op.create_table(
        'jobs',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('dataset_id', sa.Uuid(as_uuid=True), sa.ForeignKey('datasets.id'), nullable=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('job_type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('progress', sa.Float(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('results', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )

    # CREATE MODELS TABLE
    op.create_table(
        'models',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('job_id', sa.Uuid(as_uuid=True), sa.ForeignKey('jobs.id'), nullable=True),
        sa.Column('dataset_id', sa.Uuid(as_uuid=True), sa.ForeignKey('datasets.id'), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('model_type', sa.String(length=50), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('storage_path', sa.String(length=500), nullable=True),
        sa.Column('is_best', sa.Boolean(), nullable=True),
        sa.Column('mlflow_run_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('models')
    op.drop_table('jobs')
    op.drop_table('datasets')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
