"""
Seed chain_personas table with curated grocery chain data.
Run: python seed_chains.py
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

CHAINS = [
    # Specialty ethnic (tier 1)
    {"chain_name": "Patel Brothers", "chain_aliases": ["patel bros"], "cuisines": ["indian", "south_asian", "pakistani", "bangladeshi", "sri_lankan"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Best for South Asian basics. Huge frozen aisle, fresh paneer, regional spice mixes."},
    {"chain_name": "H Mart", "chain_aliases": ["h-mart", "hmart"], "cuisines": ["korean", "chinese", "japanese", "vietnamese", "filipino", "east_asian"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Korean-anchored pan-Asian. Banchan section, fresh seafood, kimchi, K-snacks."},
    {"chain_name": "99 Ranch Market", "chain_aliases": ["99 ranch", "ranch 99"], "cuisines": ["chinese", "taiwanese", "vietnamese", "east_asian"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Chinese/Taiwanese-anchored. Dim sum freezer, live seafood, regional Chinese sauces."},
    {"chain_name": "Mitsuwa", "chain_aliases": ["mitsuwa marketplace"], "cuisines": ["japanese"], "authenticity_tier": 1, "price_tier": 3,
     "notes": "Japanese specialty. Imported snacks, fresh sashimi, dashi packs."},
    {"chain_name": "Seafood City", "chain_aliases": [], "cuisines": ["filipino"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Filipino specialty. Lechon, pancit, ube, banana ketchup."},
    {"chain_name": "El Super", "chain_aliases": [], "cuisines": ["mexican"], "authenticity_tier": 1, "price_tier": 1,
     "notes": "Mexican-anchored. Tortilleria, fresh masa, dried chiles, mexican cheeses."},
    {"chain_name": "Northgate Gonzalez Market", "chain_aliases": ["northgate market"], "cuisines": ["mexican"], "authenticity_tier": 1, "price_tier": 1,
     "notes": "Mexican specialty. Carnicería, regional Mexican products."},
    {"chain_name": "Eataly", "chain_aliases": [], "cuisines": ["italian"], "authenticity_tier": 1, "price_tier": 3,
     "notes": "Italian specialty. Imported pasta, DOP/IGP cheeses, San Marzano tomatoes, fresh pasta."},
    {"chain_name": "Compare Foods", "chain_aliases": [], "cuisines": ["caribbean", "dominican", "puerto_rican", "latin"], "authenticity_tier": 1, "price_tier": 1,
     "notes": "Latin/Caribbean. Plantains, yuca, sofrito, queso fresco."},
    {"chain_name": "Sahadi's", "chain_aliases": [], "cuisines": ["lebanese", "syrian", "palestinian", "middle_eastern"], "authenticity_tier": 1, "price_tier": 2,
     "notes": "Middle Eastern specialty. Bulk spices, olive oils, halva, za'atar."},

    # Premium general (tier 2)
    {"chain_name": "Whole Foods Market", "chain_aliases": ["whole foods", "wfm"], "cuisines": ["general", "italian", "mediterranean", "japanese"], "authenticity_tier": 2, "price_tier": 3,
     "notes": "Premium mainstream. Decent international section. Strong on Italian, Mediterranean, organic basics."},
    {"chain_name": "Wegmans", "chain_aliases": [], "cuisines": ["general", "italian", "mediterranean"], "authenticity_tier": 2, "price_tier": 2,
     "notes": "Quality mainstream. Strong international + prepared foods. Italian section is solid."},
    {"chain_name": "Trader Joe's", "chain_aliases": ["trader joes", "tjs"], "cuisines": ["general", "mediterranean", "italian"], "authenticity_tier": 2, "price_tier": 2,
     "notes": "Curated mainstream. Decent fusion options. Don't expect specialty ethnic."},
    {"chain_name": "Fresh Market", "chain_aliases": ["the fresh market"], "cuisines": ["general", "italian"], "authenticity_tier": 2, "price_tier": 3,
     "notes": "Premium boutique. Limited international depth."},
    {"chain_name": "Food Bazaar", "chain_aliases": ["food bazaar supermarket"], "cuisines": ["latin", "caribbean", "asian", "general"], "authenticity_tier": 2, "price_tier": 1,
     "notes": "Budget pan-international. NYC-area chain. Good cross-cultural ingredient coverage."},

    # Mainstream (tier 3)
    {"chain_name": "Stop & Shop", "chain_aliases": ["stop and shop"], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream supermarket. Limited international but covers basics."},
    {"chain_name": "ShopRite", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream supermarket. Has some international aisle."},
    {"chain_name": "Kroger", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream supermarket nationwide. International aisle varies by store."},
    {"chain_name": "Safeway", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream West Coast. Limited international."},
    {"chain_name": "Publix", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 3, "price_tier": 2,
     "notes": "Mainstream Southeast. Decent Latin section."},

    # Budget (tier 4)
    {"chain_name": "Walmart", "chain_aliases": ["walmart supercenter", "walmart neighborhood market"], "cuisines": ["general"], "authenticity_tier": 4, "price_tier": 1,
     "notes": "Budget mainstream. Limited international beyond Latin basics."},
    {"chain_name": "Aldi", "chain_aliases": [], "cuisines": ["general"], "authenticity_tier": 4, "price_tier": 1,
     "notes": "Budget mainstream. Mostly private label, limited international."},
]


def seed():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    sb = create_client(url, key)

    print("Clearing existing chain_personas...")
    sb.table("chain_personas").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print(f"Seeding {len(CHAINS)} chains...")
    for chain in CHAINS:
        sb.table("chain_personas").insert(chain).execute()
        print(f"  + {chain['chain_name']}")

    print(f"\nDone. Seeded {len(CHAINS)} chains.")


if __name__ == "__main__":
    seed()
