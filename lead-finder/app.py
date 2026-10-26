import time
from urllib.parse import urlparse
import re
import pandas as pd
import requests
import streamlit as st
from ddgs import DDGS

HEADERS={"User-Agent":"DentalLeadFinder/1.0 (business contact research)"}
CITIES=["Малин","Коростень","Житомир","Бердичів","Звягель","Вінниця","Рівне","Луцьк","Тернопіль","Хмельницький","Черкаси","Біла Церква","Умань"]

def instagram(value):
    v=str(value or "").strip()
    if v.startswith("@"): v=v[1:]
    if re.fullmatch(r"[A-Za-z0-9._]{2,30}",v):
        return "https://www.instagram.com/"+v+"/"
    p=urlparse(v)
    if (p.hostname or "").removeprefix("www.") not in ("instagram.com","instagr.am"): return ""
    parts=[x for x in p.path.split("/") if x]
    return instagram(parts[0]) if len(parts)==1 and parts[0] not in ("p","reel","reels","stories","explore","accounts","direct") else ""

def record(name,city,source,url):
    return {"Назва":name,"Місто":city,"Джерело":source,"Сайт":"","Instagram":"","Facebook":"","Telegram":"","Email":"","Написати":"","Статус":"Не писав","Нотатки":"","Джерело URL":url}

def finish(r):
    r["Написати"]=r["Instagram"] or ("mailto:"+r["Email"] if r["Email"] else "") or r["Telegram"] or r["Facebook"]
    return r

def osm(city):
    g=requests.get("https://nominatim.openstreetmap.org/search",params={"q":city+", Україна","format":"json","limit":1,"countrycodes":"ua"},headers=HEADERS,timeout=20)
    g.raise_for_status()
    results=g.json()
    if not results:return []
    s,n,w,e=results[0]["boundingbox"]
    bbox=f"{s},{w},{n},{e}"
    query=(f'[out:json][timeout:35];('
           f'node["amenity"="dentist"]({bbox});way["amenity"="dentist"]({bbox});'
           f'node["healthcare"="dentist"]({bbox});way["healthcare"="dentist"]({bbox});'
           f');out center tags;')
    resp=requests.post("https://overpass-api.de/api/interpreter",data={"data":query},headers=HEADERS,timeout=48)
    resp.raise_for_status()
    out=[]
    for el in resp.json().get("elements",[]):
        t=el.get("tags",{})
        name=t.get("name:uk") or t.get("name")
        if not name:continue
        r=record(name,city,"OpenStreetMap",f'https://www.openstreetmap.org/{el["type"]}/{el["id"]}')
        r["Сайт"]=t.get("website") or t.get("contact:website") or ""
        r["Instagram"]=instagram(t.get("contact:instagram") or t.get("instagram"))
        r["Facebook"]=t.get("contact:facebook") or t.get("facebook") or ""
        r["Email"]=t.get("contact:email") or t.get("email") or ""
        tg=t.get("contact:telegram") or t.get("telegram") or ""
        r["Telegram"]="https://t.me/"+tg.lstrip("@") if tg and not tg.startswith("http") else tg
        out.append(finish(r))
    return out

def search_ig(city,count):
    results=DDGS(timeout=12).text(f"стоматологія {city} site:instagram.com",region="ua-uk",max_results=count) or []
    out=[]
    for item in results:
        url=instagram(item.get("href"))
        if not url:continue
        title=(item.get("title") or "").split("•")[0].split("(@")[0].strip()
        r=record(title[:90] if len(title)>3 else "@"+url.strip("/").split("/")[-1],city,"Вебпошук (місто перевірити!)",item.get("href") or url)
        r["Instagram"]=url
        r["Нотатки"]="Перевірити, що клініка справді у вказаному місті."
        out.append(finish(r))
    return out

st.set_page_config(page_title="Dental Lead Finder",page_icon="🦷",layout="wide")
st.title("🦷 Пошук клієнтів без дзвінків")
st.caption("Контакти з публічних джерел. Не автоматизує розсилки.")
cities=st.multiselect("Міста",CITIES,default=["Малин","Коростень","Житомир"])
count=st.slider("Результатів вебпошуку на місто",5,30,15,5)
a,b=st.columns(2)
use_osm=a.checkbox("Знайти стоматології на карті",True)
use_ig=b.checkbox("Знайти Instagram у вебпошуку",True)
if "leads" not in st.session_state: st.session_state.leads=pd.DataFrame()
if st.button("🔎 Знайти контакти",type="primary"):
    if not cities or not(use_osm or use_ig):st.warning("Обери міста й джерело.")
    else:
        rows=[]
        for city in cities:
            if use_osm:
                try:rows.extend(osm(city))
                except Exception as exc:st.warning(f"{city} / OSM: {str(exc)[:140]}")
                time.sleep(1.1)
            if use_ig:
                try:rows.extend(search_ig(city,count))
                except Exception as exc:st.warning(f"{city} / Instagram: {str(exc)[:140]}")
        st.session_state.leads=pd.DataFrame(rows).drop_duplicates(subset=["Місто","Назва","Instagram"]) if rows else pd.DataFrame()
if not st.session_state.leads.empty:
    df=st.session_state.leads.copy()
    st.write(f"Знайдено **{len(df)}** записів; є спосіб написати **{df['Написати'].astype(bool).sum()}**.")
    st.caption("Відсутність сайту в джерелі НЕ означає, що його немає. Вебрезультати можуть бути не з того міста.")
    only=st.checkbox("Лише контакти для повідомлення",True)
    without=st.checkbox("Сайт не вказаний у джерелі",False)
    subset=df.copy()
    if only:subset=subset[subset["Написати"].astype(bool)]
    if without:subset=subset[~subset["Сайт"].astype(bool)]
    edited=st.data_editor(subset,hide_index=True,height=450,use_container_width=True,
        disabled=[c for c in df.columns if c not in ("Статус","Нотатки")],
        column_config={"Написати":st.column_config.LinkColumn("Написати"),"Instagram":st.column_config.LinkColumn("Instagram"),"Facebook":st.column_config.LinkColumn("Facebook"),"Telegram":st.column_config.LinkColumn("Telegram"),"Сайт":st.column_config.LinkColumn("Сайт"),"Джерело URL":st.column_config.LinkColumn("Джерело URL"),"Статус":st.column_config.SelectboxColumn("Статус",options=["Не писав","Написав","Відповіли","Цікавиться","Не цікаво","Продаж"])})
    df.loc[edited.index,["Статус","Нотатки"]]=edited[["Статус","Нотатки"]]
    st.session_state.leads=df
    st.download_button("⬇️ Завантажити CSV",df.to_csv(index=False).encode("utf-8-sig"),"kliniky.csv","text/csv")
    if len(edited):
        choice=st.selectbox("Кому написати",edited.index,format_func=lambda i:f"{df.at[i,'Назва']} — {df.at[i,'Місто']}")
        st.code("Добрий день! 👋\n\nЯ створюю сучасні сайти для стоматологій. Маю готовий приклад, який можу адаптувати під вашу клініку: послуги, лікарі, ціни та запис. Вартість — 3 000 грн.\n\nМожна надіслати демоверсію?",language=None)
        if df.at[choice,"Написати"]:st.link_button("Відкрити сторінку / контакт",df.at[choice,"Написати"])
else:st.info("Обери міста й натисни «Знайти контакти».")
st.caption("© OpenStreetMap contributors / ODbL; вебрезультати DDGS.")
