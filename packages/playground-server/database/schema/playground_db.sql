CREATE SCHEMA playground_db
    AUTHORIZATION postgres;

CREATE TABLE playground_db."users"
(
    id uuid NOT NULL,
    username character varying(255) COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    eth_address character varying(42) COLLATE pg_catalog."default",
    multisig_address character varying(42) COLLATE pg_catalog."default",
    transaction_hash character varying(255),
    node_address character varying(128) COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT uk_users__username UNIQUE (username)

 )
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

 ALTER TABLE playground_db.users
    OWNER to postgres;

CREATE TABLE playground_db."playground_snapshot"
(
    snapshot bytea
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE playground_db.playground_snapshot
    OWNER to postgres;