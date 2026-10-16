import { RpcAuthMiddlewareLive, RpcsLive } from "@framecast/web-backend";
import { Rpcs } from "@framecast/web-domain";
import { HttpServer } from "@effect/platform";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Layer } from "effect";
import { Dependencies } from "@/lib/server";

const rpcLayer = Layer.mergeAll(
	RpcAuthMiddlewareLive,
	RpcsLive,
	RpcSerialization.layerJson,
	HttpServer.layerContext,
);

const { handler } = RpcServer.toWebHandler(Rpcs, {
	layer: Layer.provide(Dependencies)(rpcLayer),
});

export const GET = (r: Request) => handler(r);
export const POST = (r: Request) => handler(r);
