from .traders import Trader
from typing import List
import asyncio
from .tracers import LogTracer
from agents import add_trace_processor
from .market import is_market_open
from dotenv import load_dotenv
import os

load_dotenv(override=True)

RUN_EVERY_N_MINUTES = int(os.getenv("RUN_EVERY_N_MINUTES", "60"))
RUN_EVEN_WHEN_MARKET_IS_CLOSED = (
    os.getenv("RUN_EVEN_WHEN_MARKET_IS_CLOSED", "false").strip().lower() == "true"
)
USE_MANY_MODELS = os.getenv("USE_MANY_MODELS", "false").strip().lower() == "true"

names = ["Omkar_trader1", "Omkar_trader2", "Omkar_trader3", "Omkar_trader4"]
lastnames = ["Patience", "Bold", "Systematic", "Crypto"]


model_names = ["gpt-5.4-mini","gpt-4o-mini","llama-3.3-70b-versatile", "qwen/qwen3-32b",]
short_model_names = ["GPT 5.4 Mini","GPT-4o Mini","Llama 3.3 70B","Qwen 3 32B",]


def create_traders() -> List[Trader]:
    traders = []
    for name, lastname, model_name in zip(names, lastnames, model_names):
        traders.append(Trader(name, lastname, model_name))
    return traders


async def run_every_n_minutes():
    add_trace_processor(LogTracer())
    traders = create_traders()
    while True:
        if RUN_EVEN_WHEN_MARKET_IS_CLOSED or is_market_open():
            await asyncio.gather(*[trader.run() for trader in traders])
        else:
            print("Market is closed, skipping run")
        await asyncio.sleep(RUN_EVERY_N_MINUTES * 60)


if __name__ == "__main__":
    print(f"Starting scheduler to run every {RUN_EVERY_N_MINUTES} minutes")
    asyncio.run(run_every_n_minutes())
