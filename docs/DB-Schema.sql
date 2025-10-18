--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 17.4

-- Started on 2025-10-18 11:49:50

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: splitdine_prod_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO splitdine_prod_user;

--
-- TOC entry 2 (class 3079 OID 19376)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 3526 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 21871)
-- Name: app_user; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.app_user (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    reset_token character varying(255),
    reset_token_expires timestamp with time zone
);


ALTER TABLE public.app_user OWNER TO splitdine_prod_user;

--
-- TOC entry 3527 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE app_user; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON TABLE public.app_user IS 'User accounts for event hosts';


--
-- TOC entry 3528 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.email; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.email IS 'User email - must be unique';


--
-- TOC entry 3529 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.password_hash; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.password_hash IS 'Bcrypt hashed password';


--
-- TOC entry 3530 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.name; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.name IS 'Display name shown to guests';


--
-- TOC entry 3531 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.email_verified; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.email_verified IS 'Whether email has been verified';


--
-- TOC entry 3532 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.verification_token; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.verification_token IS 'Token for email verification';


--
-- TOC entry 3533 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.reset_token; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.reset_token IS 'Token for password reset';


--
-- TOC entry 3534 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.reset_token_expires; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.reset_token_expires IS 'When reset token expires';


--
-- TOC entry 222 (class 1259 OID 21870)
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: splitdine_prod_user
--

CREATE SEQUENCE public.app_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_user_id_seq OWNER TO splitdine_prod_user;

--
-- TOC entry 3535 (class 0 OID 0)
-- Dependencies: 222
-- Name: app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.app_user_id_seq OWNED BY public.app_user.id;


--
-- TOC entry 217 (class 1259 OID 21814)
-- Name: events; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.events (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    guest_code character varying(10) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id integer,
    bank_account_number character varying(50),
    bank_sort_code character varying(20),
    bank_account_name character varying(255),
    payment_method character varying(20) DEFAULT 'venue'::character varying NOT NULL,
    allow_guest_editing boolean DEFAULT true,
    allow_guest_notes_edit boolean DEFAULT true NOT NULL,
    host_contact_info character varying(200)
);


ALTER TABLE public.events OWNER TO splitdine_prod_user;

--
-- TOC entry 3536 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.user_id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.user_id IS 'Owner of the event (optional - for registered users)';


--
-- TOC entry 3537 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.bank_account_number; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.bank_account_number IS 'Bank account number for receiving payments';


--
-- TOC entry 3538 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.bank_sort_code; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.bank_sort_code IS 'Bank sort code (e.g., 04-00-03)';


--
-- TOC entry 3539 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.bank_account_name; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.bank_account_name IS 'Name on the bank account';


--
-- TOC entry 3540 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.payment_method; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.payment_method IS 'Payment method: ''venue'' for paying at till,
     ''bank_transfer'' for bank transfer';


--
-- TOC entry 3541 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.allow_guest_notes_edit; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.allow_guest_notes_edit IS 'Whether guests can edit their own pre-order notes';


--
-- TOC entry 3542 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.host_contact_info; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.host_contact_info IS 'Optional contact information provided by host for guests (phone, email, WhatsApp, etc.)';


--
-- TOC entry 216 (class 1259 OID 21813)
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: splitdine_prod_user
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO splitdine_prod_user;

--
-- TOC entry 3543 (class 0 OID 0)
-- Dependencies: 216
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- TOC entry 221 (class 1259 OID 21836)
-- Name: guest_items; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.guest_items (
    id integer NOT NULL,
    guest_id integer NOT NULL,
    note character varying(500) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    price numeric(10,2),
    event_id integer NOT NULL
);


ALTER TABLE public.guest_items OWNER TO splitdine_prod_user;

--
-- TOC entry 220 (class 1259 OID 21835)
-- Name: guest_items_id_seq; Type: SEQUENCE; Schema: public; Owner: splitdine_prod_user
--

CREATE SEQUENCE public.guest_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guest_items_id_seq OWNER TO splitdine_prod_user;

--
-- TOC entry 3544 (class 0 OID 0)
-- Dependencies: 220
-- Name: guest_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.guest_items_id_seq OWNED BY public.guest_items.id;


--
-- TOC entry 219 (class 1259 OID 21823)
-- Name: guests; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.guests (
    id integer NOT NULL,
    event_id integer NOT NULL,
    name character varying(255) NOT NULL,
    amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    deposit numeric(10,2) DEFAULT 0.00 NOT NULL,
    notes text,
    paid boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    app_user_id integer,
    co_host boolean DEFAULT false NOT NULL
);


ALTER TABLE public.guests OWNER TO splitdine_prod_user;

--
-- TOC entry 3545 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN guests.co_host; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.guests.co_host IS 'Whether this guest is a co-host (has host permissions delegated by primary host)';


--
-- TOC entry 218 (class 1259 OID 21822)
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: splitdine_prod_user
--

CREATE SEQUENCE public.guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guests_id_seq OWNER TO splitdine_prod_user;

--
-- TOC entry 3546 (class 0 OID 0)
-- Dependencies: 218
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- TOC entry 224 (class 1259 OID 22012)
-- Name: zarchive_events; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.zarchive_events (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    guest_code character varying(10) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id integer,
    bank_account_number character varying(50),
    bank_sort_code character varying(20),
    bank_account_name character varying(255),
    payment_method character varying(20) DEFAULT 'venue'::character varying NOT NULL,
    allow_guest_editing boolean DEFAULT true,
    allow_guest_notes_edit boolean DEFAULT true NOT NULL,
    host_contact_info character varying(200),
    archived_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_by integer
);


ALTER TABLE public.zarchive_events OWNER TO splitdine_prod_user;

--
-- TOC entry 3547 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE zarchive_events; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON TABLE public.zarchive_events IS 'Archive of deleted events for analytics and audit trail';


--
-- TOC entry 3548 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN zarchive_events.id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_events.id IS 'Original event ID from events table';


--
-- TOC entry 3549 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN zarchive_events.archived_at; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_events.archived_at IS 'When the event was deleted';


--
-- TOC entry 3550 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN zarchive_events.archived_by; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_events.archived_by IS 'User ID who deleted the event';


--
-- TOC entry 226 (class 1259 OID 22037)
-- Name: zarchive_guest_items; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.zarchive_guest_items (
    id integer NOT NULL,
    guest_id integer NOT NULL,
    note character varying(500) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    price numeric(10,2),
    event_id integer NOT NULL,
    archived_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_by integer
);


ALTER TABLE public.zarchive_guest_items OWNER TO splitdine_prod_user;

--
-- TOC entry 3551 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE zarchive_guest_items; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON TABLE public.zarchive_guest_items IS 'Archive of deleted guest items for analytics and audit trail';


--
-- TOC entry 3552 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN zarchive_guest_items.id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guest_items.id IS 'Original item ID from guest_items table';


--
-- TOC entry 3553 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN zarchive_guest_items.guest_id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guest_items.guest_id IS 'Guest ID this item belonged to (may be archived)';


--
-- TOC entry 3554 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN zarchive_guest_items.event_id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guest_items.event_id IS 'Event ID this item belonged to (may be archived)';


--
-- TOC entry 3555 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN zarchive_guest_items.archived_at; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guest_items.archived_at IS 'When the item was deleted';


--
-- TOC entry 3556 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN zarchive_guest_items.archived_by; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guest_items.archived_by IS 'User ID who deleted the item (or caused cascade delete)';


--
-- TOC entry 225 (class 1259 OID 22024)
-- Name: zarchive_guests; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.zarchive_guests (
    id integer NOT NULL,
    event_id integer NOT NULL,
    name character varying(255) NOT NULL,
    amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    deposit numeric(10,2) DEFAULT 0.00 NOT NULL,
    notes text,
    paid boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    app_user_id integer,
    co_host boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_by integer
);


ALTER TABLE public.zarchive_guests OWNER TO splitdine_prod_user;

--
-- TOC entry 3557 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE zarchive_guests; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON TABLE public.zarchive_guests IS 'Archive of deleted guests for analytics and audit trail';


--
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN zarchive_guests.id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guests.id IS 'Original guest ID from guests table';


--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN zarchive_guests.event_id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guests.event_id IS 'Event ID this guest belonged to (may be archived)';


--
-- TOC entry 3560 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN zarchive_guests.archived_at; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guests.archived_at IS 'When the guest was deleted';


--
-- TOC entry 3561 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN zarchive_guests.archived_by; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.zarchive_guests.archived_by IS 'User ID who deleted the guest';


--
-- TOC entry 3337 (class 2604 OID 21874)
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- TOC entry 3327 (class 2604 OID 21817)
-- Name: events id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- TOC entry 3336 (class 2604 OID 21839)
-- Name: guest_items id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guest_items ALTER COLUMN id SET DEFAULT nextval('public.guest_items_id_seq'::regclass);


--
-- TOC entry 3331 (class 2604 OID 21826)
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- TOC entry 3364 (class 2606 OID 21883)
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- TOC entry 3366 (class 2606 OID 21881)
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- TOC entry 3352 (class 2606 OID 21819)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 3360 (class 2606 OID 21843)
-- Name: guest_items guest_items_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guest_items
    ADD CONSTRAINT guest_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3356 (class 2606 OID 21833)
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- TOC entry 3367 (class 1259 OID 21884)
-- Name: idx_app_user_email; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_app_user_email ON public.app_user USING btree (email);


--
-- TOC entry 3368 (class 1259 OID 21894)
-- Name: idx_app_user_reset_token; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_app_user_reset_token ON public.app_user USING btree (reset_token) WHERE (reset_token IS NOT NULL);


--
-- TOC entry 3369 (class 1259 OID 22021)
-- Name: idx_events_archive_archived_at; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_events_archive_archived_at ON public.zarchive_events USING btree (archived_at);


--
-- TOC entry 3370 (class 1259 OID 22023)
-- Name: idx_events_archive_created_at; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_events_archive_created_at ON public.zarchive_events USING btree (created_at);


--
-- TOC entry 3371 (class 1259 OID 22022)
-- Name: idx_events_archive_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_events_archive_user_id ON public.zarchive_events USING btree (user_id);


--
-- TOC entry 3353 (class 1259 OID 21821)
-- Name: idx_events_guest_code; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE UNIQUE INDEX idx_events_guest_code ON public.events USING btree (guest_code);


--
-- TOC entry 3354 (class 1259 OID 21885)
-- Name: idx_events_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_events_user_id ON public.events USING btree (user_id);


--
-- TOC entry 3375 (class 1259 OID 22043)
-- Name: idx_guest_items_archive_archived_at; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_archive_archived_at ON public.zarchive_guest_items USING btree (archived_at);


--
-- TOC entry 3376 (class 1259 OID 22045)
-- Name: idx_guest_items_archive_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_archive_event_id ON public.zarchive_guest_items USING btree (event_id);


--
-- TOC entry 3377 (class 1259 OID 22044)
-- Name: idx_guest_items_archive_guest_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_archive_guest_id ON public.zarchive_guest_items USING btree (guest_id);


--
-- TOC entry 3361 (class 1259 OID 21910)
-- Name: idx_guest_items_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_event_id ON public.guest_items USING btree (event_id);


--
-- TOC entry 3362 (class 1259 OID 21844)
-- Name: idx_guest_items_guest_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_guest_id ON public.guest_items USING btree (guest_id);


--
-- TOC entry 3357 (class 1259 OID 21909)
-- Name: idx_guests_app_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_app_user_id ON public.guests USING btree (app_user_id);


--
-- TOC entry 3372 (class 1259 OID 22036)
-- Name: idx_guests_archive_app_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_archive_app_user_id ON public.zarchive_guests USING btree (app_user_id);


--
-- TOC entry 3373 (class 1259 OID 22034)
-- Name: idx_guests_archive_archived_at; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_archive_archived_at ON public.zarchive_guests USING btree (archived_at);


--
-- TOC entry 3374 (class 1259 OID 22035)
-- Name: idx_guests_archive_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_archive_event_id ON public.zarchive_guests USING btree (event_id);


--
-- TOC entry 3358 (class 1259 OID 21834)
-- Name: idx_guests_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_event_id ON public.guests USING btree (event_id);


--
-- TOC entry 2115 (class 826 OID 21808)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO splitdine_prod_user;


--
-- TOC entry 2114 (class 826 OID 21807)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO splitdine_prod_user;


-- Completed on 2025-10-18 11:49:52

--
-- PostgreSQL database dump complete
--

