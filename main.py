#　FastAPI：高速なAPIサーバーを簡単に作成できるフレームワーク
from fastapi import FastAPI

# ファイルレスポンスを返すためのクラス
from fastapi.responses import FileResponse  

# CORS（Cross-Origin Resource Sharing）を制御するためのミドルウェア。どこからでもアクセスOKにしてくれてるらしい
from fastapi.middleware.cors import CORSMiddleware 

# 図形操作ライブラリ
from shapely.geometry import Polygon

# 座標変換ライブラリ
from pyproj import Transformer

app = FastAPI() # サーバー本体を、appという名前で作成

@app.get("/") # ルートパス（/）にGETリクエストが来たら、以下の関数を実行
async def root():
    return FileResponse("index.html") # index.htmlファイルを返す

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

transformer = Transformer.from_crs(
    "EPSG:4326",  # WGS84（緯度経度）
    "EPSG:3857",  # Webメルカトル（平面直角座標系）
    always_xy=True,
)

@app.post("/area") # /areaにPOSTリクエストが来たら、以下の関数を実行
async def calc_area(data: dict): # ブラウザから送られてきたjsonデータをdataとして受け取る
    coords = data["coords"]

    polygon = Polygon(coords) # 受け取った座標データを多角形の図形に変換

    area = polygon.area # 多角形の面積を計算(.areaで求めれるらしい)

    return {"area": area} # areaという名前で、計算結果をjson形式で返す