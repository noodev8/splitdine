--
-- PostgreSQL database dump
--

-- Dumped from database version 11.18 (Debian 11.18-0+deb10u1)
-- Dumped by pg_dump version 17.1

-- Started on 2025-04-04 20:24:43

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
-- TOC entry 7 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 21177)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 3025 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

--
-- TOC entry 202 (class 1259 OID 21046)
-- Name: app_user; Type: TABLE; Schema: public; Owner: main
--

CREATE TABLE public.app_user (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_level character varying(20),
    password character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.app_user OWNER TO main;

--
-- TOC entry 201 (class 1259 OID 21044)
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: main
--

CREATE SEQUENCE public.app_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_user_id_seq OWNER TO main;

--
-- TOC entry 3026 (class 0 OID 0)
-- Dependencies: 201
-- Name: app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: main
--

ALTER SEQUENCE public.app_user_id_seq OWNED BY public.app_user.id;


--
-- TOC entry 204 (class 1259 OID 21094)
-- Name: event; Type: TABLE; Schema: public; Owner: main
--

CREATE TABLE public.event (
    id integer NOT NULL,
    restaurant_id integer,
    created_by integer NOT NULL,
    total_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    event_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    locked boolean,
    public_event_code character varying(10)
);


ALTER TABLE public.event OWNER TO main;

--
-- TOC entry 203 (class 1259 OID 21092)
-- Name: event_id_seq; Type: SEQUENCE; Schema: public; Owner: main
--

CREATE SEQUENCE public.event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_id_seq OWNER TO main;

--
-- TOC entry 3027 (class 0 OID 0)
-- Dependencies: 203
-- Name: event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: main
--

ALTER SEQUENCE public.event_id_seq OWNED BY public.event.id;


--
-- TOC entry 206 (class 1259 OID 21113)
-- Name: guest; Type: TABLE; Schema: public; Owner: main
--

CREATE TABLE public.guest (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20),
    locked boolean
);


ALTER TABLE public.guest OWNER TO main;

--
-- TOC entry 205 (class 1259 OID 21111)
-- Name: guest_id_seq; Type: SEQUENCE; Schema: public; Owner: main
--

CREATE SEQUENCE public.guest_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guest_id_seq OWNER TO main;

--
-- TOC entry 3028 (class 0 OID 0)
-- Dependencies: 205
-- Name: guest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: main
--

ALTER SEQUENCE public.guest_id_seq OWNED BY public.guest.id;


--
-- TOC entry 200 (class 1259 OID 20973)
-- Name: menu; Type: TABLE; Schema: public; Owner: main
--

CREATE TABLE public.menu (
    id integer NOT NULL,
    restaurant_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.menu OWNER TO main;

--
-- TOC entry 199 (class 1259 OID 20971)
-- Name: menu_id_seq; Type: SEQUENCE; Schema: public; Owner: main
--

CREATE SEQUENCE public.menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_id_seq OWNER TO main;

--
-- TOC entry 3029 (class 0 OID 0)
-- Dependencies: 199
-- Name: menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: main
--

ALTER SEQUENCE public.menu_id_seq OWNED BY public.menu.id;


--
-- TOC entry 208 (class 1259 OID 21150)
-- Name: order_item; Type: TABLE; Schema: public; Owner: main
--

CREATE TABLE public.order_item (
    id integer NOT NULL,
    event_id integer NOT NULL,
    guest_id integer NOT NULL,
    menu_id integer,
    custom_item_name character varying(255),
    quantity integer NOT NULL,
    price_at_time numeric(10,2) NOT NULL,
    locked boolean,
    CONSTRAINT order_item_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_item OWNER TO main;

--
-- TOC entry 207 (class 1259 OID 21148)
-- Name: order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: main
--

CREATE SEQUENCE public.order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_item_id_seq OWNER TO main;

--
-- TOC entry 3030 (class 0 OID 0)
-- Dependencies: 207
-- Name: order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: main
--

ALTER SEQUENCE public.order_item_id_seq OWNED BY public.order_item.id;


--
-- TOC entry 198 (class 1259 OID 20961)
-- Name: restaurant; Type: TABLE; Schema: public; Owner: main
--

CREATE TABLE public.restaurant (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    address text NOT NULL,
    city character varying(100) NOT NULL,
    postcode character varying(20) NOT NULL,
    phone character varying(20),
    website character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rating integer,
    longitude numeric(9,6),
    latitude numeric(9,6),
    fhrsid integer
);


ALTER TABLE public.restaurant OWNER TO main;

--
-- TOC entry 197 (class 1259 OID 20959)
-- Name: restaurant_id_seq; Type: SEQUENCE; Schema: public; Owner: main
--

CREATE SEQUENCE public.restaurant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.restaurant_id_seq OWNER TO main;

--
-- TOC entry 3031 (class 0 OID 0)
-- Dependencies: 197
-- Name: restaurant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: main
--

ALTER SEQUENCE public.restaurant_id_seq OWNED BY public.restaurant.id;


--
-- TOC entry 2862 (class 2604 OID 21049)
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- TOC entry 2865 (class 2604 OID 21097)
-- Name: event id; Type: DEFAULT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.event ALTER COLUMN id SET DEFAULT nextval('public.event_id_seq'::regclass);


--
-- TOC entry 2868 (class 2604 OID 21116)
-- Name: guest id; Type: DEFAULT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.guest ALTER COLUMN id SET DEFAULT nextval('public.guest_id_seq'::regclass);


--
-- TOC entry 2860 (class 2604 OID 20976)
-- Name: menu id; Type: DEFAULT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.menu ALTER COLUMN id SET DEFAULT nextval('public.menu_id_seq'::regclass);


--
-- TOC entry 2869 (class 2604 OID 21153)
-- Name: order_item id; Type: DEFAULT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.order_item ALTER COLUMN id SET DEFAULT nextval('public.order_item_id_seq'::regclass);


--
-- TOC entry 2858 (class 2604 OID 20964)
-- Name: restaurant id; Type: DEFAULT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.restaurant ALTER COLUMN id SET DEFAULT nextval('public.restaurant_id_seq'::regclass);


--
-- TOC entry 2883 (class 2606 OID 21054)
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- TOC entry 2885 (class 2606 OID 21052)
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- TOC entry 2887 (class 2606 OID 21100)
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY (id);


--
-- TOC entry 2889 (class 2606 OID 21118)
-- Name: guest guest_pkey; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.guest
    ADD CONSTRAINT guest_pkey PRIMARY KEY (id);


--
-- TOC entry 2881 (class 2606 OID 20982)
-- Name: menu menu_pkey; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_pkey PRIMARY KEY (id);


--
-- TOC entry 2891 (class 2606 OID 21156)
-- Name: order_item order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_pkey PRIMARY KEY (id);


--
-- TOC entry 2874 (class 2606 OID 21293)
-- Name: restaurant restaurant_fhrsid_key; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.restaurant
    ADD CONSTRAINT restaurant_fhrsid_key UNIQUE (fhrsid);


--
-- TOC entry 2877 (class 2606 OID 20970)
-- Name: restaurant restaurant_pkey; Type: CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.restaurant
    ADD CONSTRAINT restaurant_pkey PRIMARY KEY (id);


--
-- TOC entry 2878 (class 1259 OID 21689)
-- Name: idx_menu_itemname_trgm; Type: INDEX; Schema: public; Owner: main
--

CREATE INDEX idx_menu_itemname_trgm ON public.menu USING gin (item_name public.gin_trgm_ops);


--
-- TOC entry 2879 (class 1259 OID 20991)
-- Name: idx_menu_restaurant_id; Type: INDEX; Schema: public; Owner: main
--

CREATE INDEX idx_menu_restaurant_id ON public.menu USING btree (restaurant_id);


--
-- TOC entry 2871 (class 1259 OID 21489)
-- Name: idx_restaurant_address_lower_trgm; Type: INDEX; Schema: public; Owner: main
--

CREATE INDEX idx_restaurant_address_lower_trgm ON public.restaurant USING gin (lower(address) public.gin_trgm_ops);


--
-- TOC entry 2872 (class 1259 OID 21490)
-- Name: idx_restaurant_postcode_lower_trgm; Type: INDEX; Schema: public; Owner: main
--

CREATE INDEX idx_restaurant_postcode_lower_trgm ON public.restaurant USING gin (lower((postcode)::text) public.gin_trgm_ops);


--
-- TOC entry 2875 (class 1259 OID 21474)
-- Name: restaurant_name_trgm_idx; Type: INDEX; Schema: public; Owner: main
--

CREATE INDEX restaurant_name_trgm_idx ON public.restaurant USING gin (name public.gin_trgm_ops);


--
-- TOC entry 2892 (class 2606 OID 21106)
-- Name: event event_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 2893 (class 2606 OID 21119)
-- Name: guest guest_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.guest
    ADD CONSTRAINT guest_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event(id) ON DELETE CASCADE;


--
-- TOC entry 2894 (class 2606 OID 21124)
-- Name: guest guest_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.guest
    ADD CONSTRAINT guest_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;


--
-- TOC entry 2895 (class 2606 OID 21157)
-- Name: order_item order_item_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event(id) ON DELETE CASCADE;


--
-- TOC entry 2896 (class 2606 OID 21162)
-- Name: order_item order_item_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guest(id) ON DELETE CASCADE;


--
-- TOC entry 2897 (class 2606 OID 21167)
-- Name: order_item order_item_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: main
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menu(id) ON DELETE SET NULL;


--
-- TOC entry 3024 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2025-04-04 20:24:45

--
-- PostgreSQL database dump complete
--

