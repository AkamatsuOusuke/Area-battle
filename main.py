#　FastAPI：高速なAPIサーバーを簡単に作成できるフレームワーク
from fastapi import FastAPI

# ファイルレスポンスを返すためのクラス
from fastapi.responses import FileResponse 

from fastapi import Response

# CORS（Cross-Origin Resource Sharing）を制御するためのミドルウェア。どこからでもアクセスOKにしてくれてるらしい
from fastapi.middleware.cors import CORSMiddleware 

# 図形操作ライブラリ
from shapely.geometry import Polygon

# 座標変換ライブラリ
from pyproj import Transformer

# 日付操作用ライブラリ
import datetime

# データベース接続用
import psycopg2
import os

# データベース接続
DATABASE_URL = os.environ["DATABASE_URL"]

def get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode="require")

app = FastAPI() # サーバー本体を、appという名前で作成

@app.get("/") # ルートパス（/）にGETリクエストが来たら、以下の関数を実行
async def root(response: Response):
    response.headers["Cache-Control"] = "no-store"  # ブラウザが常に最新を取得する
    return FileResponse("index.html") # index.htmlファイルを返す

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 座標変換器の作成（緯度経度→平面直角座標系）
transformer = Transformer.from_crs(
    "EPSG:4326",  # WGS84（緯度経度）
    "EPSG:3857",  # Webメルカトル（平面直角座標系）
    always_xy=True,
)

@app.post("/area") # /areaにPOSTリクエストが来たら、以下の関数を実行
async def calc_area(data: dict): # ブラウザから送られてきたjsonデータをdataとして受け取る
    coords = data["coords"]
    name = data["name"]

    polygon = Polygon(coords) # 受け取った座標データを多角形の図形に変換

    area = polygon.area # 多角形の面積を計算(.areaで求めれるらしい)

    conn = get_conn() # 

    cur = conn.cursor() #

    now = datetime.datetime.now().isoformat() # 現在日時をISO形式で取得

    cur.execute(
        "INSERT INTO ranking (username, area, created_at) VALUES (%s, %s, %s)", 
        (name, area, now)
        ) #areasテーブルに、username, area, created_atデータを挿入
    conn.commit()
    cur.close()
    conn.close()

    return {"area": area} # areaという名前で、計算結果をjson形式で返す

# ランキング取得
@app.get("/ranking") # /rankingにGETリクエストが来たら、以下の関数を実行
async def ranking():

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT username, area
        FROM ranking
        ORDER BY area DESC
        LIMIT 10""") # rankingテーブルからusernameとareaを取得し、areaを降順に並べて上位10件を取得
    
    rows = cur.fetchall() # 取得した行をすべて取得

    cur.close()
    conn.close()

    result =[]
    for r in rows: 
        result.append({ # 辞書型でデータを格納
            "username":r[0], 
            "area":r[1]
        })
    return result