--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 17.4

-- Started on 2025-10-14 23:16:42

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
-- TOC entry 3494 (class 0 OID 0)
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
-- TOC entry 3495 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE app_user; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON TABLE public.app_user IS 'User accounts for event hosts';


--
-- TOC entry 3496 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.email; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.email IS 'User email - must be unique';


--
-- TOC entry 3497 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.password_hash; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.password_hash IS 'Bcrypt hashed password';


--
-- TOC entry 3498 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.name; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.name IS 'Display name shown to guests';


--
-- TOC entry 3499 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.email_verified; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.email_verified IS 'Whether email has been verified';


--
-- TOC entry 3500 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.verification_token; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.verification_token IS 'Token for email verification';


--
-- TOC entry 3501 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN app_user.reset_token; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.app_user.reset_token IS 'Token for password reset';


--
-- TOC entry 3502 (class 0 OID 0)
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
-- TOC entry 3503 (class 0 OID 0)
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
    allow_guest_editing boolean DEFAULT true
);


ALTER TABLE public.events OWNER TO splitdine_prod_user;

--
-- TOC entry 3504 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.user_id; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.user_id IS 'Owner of the event (optional - for registered users)';


--
-- TOC entry 3505 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.bank_account_number; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.bank_account_number IS 'Bank account number for receiving payments';


--
-- TOC entry 3506 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.bank_sort_code; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.bank_sort_code IS 'Bank sort code (e.g., 04-00-03)';


--
-- TOC entry 3507 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.bank_account_name; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.bank_account_name IS 'Name on the bank account';


--
-- TOC entry 3508 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN events.payment_method; Type: COMMENT; Schema: public; Owner: splitdine_prod_user
--

COMMENT ON COLUMN public.events.payment_method IS 'Payment method: ''venue'' for paying at till,
     ''bank_transfer'' for bank transfer';


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
-- TOC entry 3509 (class 0 OID 0)
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
-- TOC entry 3510 (class 0 OID 0)
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
-- TOC entry 3511 (class 0 OID 0)
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
-- TOC entry 3512 (class 0 OID 0)
-- Dependencies: 218
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- TOC entry 3324 (class 2604 OID 21874)
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- TOC entry 3315 (class 2604 OID 21817)
-- Name: events id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- TOC entry 3323 (class 2604 OID 21839)
-- Name: guest_items id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guest_items ALTER COLUMN id SET DEFAULT nextval('public.guest_items_id_seq'::regclass);


--
-- TOC entry 3318 (class 2604 OID 21826)
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- TOC entry 3341 (class 2606 OID 21883)
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- TOC entry 3343 (class 2606 OID 21881)
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- TOC entry 3329 (class 2606 OID 21819)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 3337 (class 2606 OID 21843)
-- Name: guest_items guest_items_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guest_items
    ADD CONSTRAINT guest_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3333 (class 2606 OID 21833)
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- TOC entry 3344 (class 1259 OID 21884)
-- Name: idx_app_user_email; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_app_user_email ON public.app_user USING btree (email);


--
-- TOC entry 3345 (class 1259 OID 21894)
-- Name: idx_app_user_reset_token; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_app_user_reset_token ON public.app_user USING btree (reset_token) WHERE (reset_token IS NOT NULL);


--
-- TOC entry 3330 (class 1259 OID 21821)
-- Name: idx_events_guest_code; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE UNIQUE INDEX idx_events_guest_code ON public.events USING btree (guest_code);


--
-- TOC entry 3331 (class 1259 OID 21885)
-- Name: idx_events_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_events_user_id ON public.events USING btree (user_id);


--
-- TOC entry 3338 (class 1259 OID 21910)
-- Name: idx_guest_items_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_event_id ON public.guest_items USING btree (event_id);


--
-- TOC entry 3339 (class 1259 OID 21844)
-- Name: idx_guest_items_guest_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_guest_id ON public.guest_items USING btree (guest_id);


--
-- TOC entry 3334 (class 1259 OID 21909)
-- Name: idx_guests_app_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_app_user_id ON public.guests USING btree (app_user_id);


--
-- TOC entry 3335 (class 1259 OID 21834)
-- Name: idx_guests_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_event_id ON public.guests USING btree (event_id);


--
-- TOC entry 2103 (class 826 OID 21808)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO splitdine_prod_user;


--
-- TOC entry 2102 (class 826 OID 21807)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO splitdine_prod_user;


-- Completed on 2025-10-14 23:16:43

--
-- PostgreSQL database dump complete
--

