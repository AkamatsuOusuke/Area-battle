#　FastAPI：高速なAPIサーバーを簡単に作成できるフレームワーク
from fastapi import FastAPI 

# CORS（Cross-Origin Resource Sharing）を制御するためのミドルウェア。どこからでもアクセスOKにしてくれてるらしい
from fastapi.middleware.cors import CORSMiddleware 


from shapely.geometry import Polygon

app = FastAPI() # サーバー本体を、appという名前で作成

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/area") # /areaにPOSTリクエストが来たら、以下の関数を実行
async def calc_area(data: dict): # ブラウザから送られてきたjsonデータをdataとして受け取る
    coords = data["coords"]

    polygon = Polygon(coords) # 受け取った座標データを多角形の図形に変換

    area = polygon.area # 多角形の面積を計算(.areaで求めれるらしい)

    return {"area": area} # areaという名前で、計算結果をjson形式で返す