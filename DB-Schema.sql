--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 17.4

-- Started on 2025-10-11 10:06:42

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
-- TOC entry 3486 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 21814)
-- Name: events; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.events (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    host_code character varying(10) NOT NULL,
    guest_code character varying(10) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.events OWNER TO splitdine_prod_user;

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
-- TOC entry 3487 (class 0 OID 0)
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
    created_at timestamp with time zone NOT NULL
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
-- TOC entry 3488 (class 0 OID 0)
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
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.guests OWNER TO splitdine_prod_user;

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
-- TOC entry 3489 (class 0 OID 0)
-- Dependencies: 218
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- TOC entry 223 (class 1259 OID 21846)
-- Name: user_event_memberships; Type: TABLE; Schema: public; Owner: splitdine_prod_user
--

CREATE TABLE public.user_event_memberships (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    event_id integer NOT NULL,
    role character varying(10) NOT NULL,
    joined_at timestamp with time zone NOT NULL,
    CONSTRAINT user_event_memberships_role_check CHECK (((role)::text = ANY ((ARRAY['host'::character varying, 'guest'::character varying])::text[])))
);


ALTER TABLE public.user_event_memberships OWNER TO splitdine_prod_user;

--
-- TOC entry 222 (class 1259 OID 21845)
-- Name: user_event_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: splitdine_prod_user
--

CREATE SEQUENCE public.user_event_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_event_memberships_id_seq OWNER TO splitdine_prod_user;

--
-- TOC entry 3490 (class 0 OID 0)
-- Dependencies: 222
-- Name: user_event_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: splitdine_prod_user
--

ALTER SEQUENCE public.user_event_memberships_id_seq OWNED BY public.user_event_memberships.id;


--
-- TOC entry 3315 (class 2604 OID 21817)
-- Name: events id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- TOC entry 3320 (class 2604 OID 21839)
-- Name: guest_items id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guest_items ALTER COLUMN id SET DEFAULT nextval('public.guest_items_id_seq'::regclass);


--
-- TOC entry 3316 (class 2604 OID 21826)
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- TOC entry 3321 (class 2604 OID 21849)
-- Name: user_event_memberships id; Type: DEFAULT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.user_event_memberships ALTER COLUMN id SET DEFAULT nextval('public.user_event_memberships_id_seq'::regclass);


--
-- TOC entry 3324 (class 2606 OID 21819)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 3331 (class 2606 OID 21843)
-- Name: guest_items guest_items_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guest_items
    ADD CONSTRAINT guest_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3328 (class 2606 OID 21833)
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- TOC entry 3337 (class 2606 OID 21852)
-- Name: user_event_memberships user_event_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: splitdine_prod_user
--

ALTER TABLE ONLY public.user_event_memberships
    ADD CONSTRAINT user_event_memberships_pkey PRIMARY KEY (id);


--
-- TOC entry 3325 (class 1259 OID 21821)
-- Name: idx_events_guest_code; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE UNIQUE INDEX idx_events_guest_code ON public.events USING btree (guest_code);


--
-- TOC entry 3326 (class 1259 OID 21820)
-- Name: idx_events_host_code; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE UNIQUE INDEX idx_events_host_code ON public.events USING btree (host_code);


--
-- TOC entry 3332 (class 1259 OID 21844)
-- Name: idx_guest_items_guest_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guest_items_guest_id ON public.guest_items USING btree (guest_id);


--
-- TOC entry 3329 (class 1259 OID 21834)
-- Name: idx_guests_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_guests_event_id ON public.guests USING btree (event_id);


--
-- TOC entry 3333 (class 1259 OID 21854)
-- Name: idx_memberships_event_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_memberships_event_id ON public.user_event_memberships USING btree (event_id);


--
-- TOC entry 3334 (class 1259 OID 21855)
-- Name: idx_memberships_user_event; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE UNIQUE INDEX idx_memberships_user_event ON public.user_event_memberships USING btree (user_id, event_id);


--
-- TOC entry 3335 (class 1259 OID 21853)
-- Name: idx_memberships_user_id; Type: INDEX; Schema: public; Owner: splitdine_prod_user
--

CREATE INDEX idx_memberships_user_id ON public.user_event_memberships USING btree (user_id);


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


-- Completed on 2025-10-11 10:06:44

--
-- PostgreSQL database dump complete
--

