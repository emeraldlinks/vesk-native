package app

import app.navigation.Route

val appRoutes: List<Route> = listOf(
    Route("/about") { About() },
    Route("/anim") { Anim() },
    Route("/blog/hello-world") { BlogPost() },
    Route("/blog") { Blog() },
    Route("/blog/vesk-native") { VeskNativePost() },
    Route("/cart") { Cart() },
    Route("/checkout") { CheckoutPage() },
    Route("/flights/{id}") { params -> FlightDetail(props = FlightDetailProps(id = params["id"] ?: "")) },
    Route("/lab/badge") { Badge() },
    Route("/lab") { Lab() },
    Route("/labs") { Labs() },
    Route("/lib") { Lib() },
    Route("/media") { Media(props = MediaProps(heading = "Native media lab", blurb = "camera, recorder, pickers & media broadcast")) },
    Route("/") { Home(props = HomeProps(promo = "Members save 20% today", cta = "Shop the drop")) },
    Route("/refresh") { Refresh() },
    Route("/shop/arctic-hoodie") { ArcticHoodie() },
    Route("/shop/merino-crew") { MerinoCrew() },
    Route("/shop") { Shop() },
    Route("/shop/snow-parka") { SnowParka() },
    Route("/shop/splitshirt-tee") { SplitTee() },
    Route("/shop/yellowstone-beanie") { Beanie() },
    Route("/sse") { SseDemo() },
    Route("/ws") { WsDemo() },
)
