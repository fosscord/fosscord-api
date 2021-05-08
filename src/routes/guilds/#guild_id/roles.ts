import { Request, Response, Router } from "express";
import { RoleModel, GuildModel, getPermission, toObject, UserModel, Snowflake, MemberModel } from "@fosscord/server-util";
import { HTTPError } from "lambert-server";
import { emitEvent } from "../../../util/Event";
import { check } from "../../../util/instanceOf";
import { RoleCreateSchema, RoleModifySchema } from "../../../schema/Roles";
import { getPublicUser } from "../../../util/User";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
	const guild_id = req.params.id;

	const guild = await GuildModel.exists({ id: guild_id });
	if (!guild) throw new HTTPError("Guild not found", 404);

	var roles = await RoleModel.find({ guild_id: guild_id }).exec();
	if(!roles) res.send("No roles");
	return res.json(toObject(roles));
});

router.post("/", check(RoleCreateSchema), async (req: Request, res: Response) => {

    const guild_id = req.params.guild_id;
    const body = req.body as RoleCreateSchema;

	const guild = await GuildModel.findOne({ id: guild_id }, { id: true }).exec();
	if (!guild) throw new HTTPError("Guild not found", 404);

	const user = await UserModel.findOne({ id: req.user_id }).exec();
	if (!user) throw new HTTPError("User not found", 404);

	const perms = await getPermission(req.user_id, guild_id);

	if (!perms.has("MANAGE_ROLES"))
		throw new HTTPError("You missing the MANAGE_ROLES permission", 401);

	const role_id = Snowflake.generate();

	var role = {
		...body,
		id: role_id,
		guild_id: guild_id,
		managed: false,
		position: 0,
		tags: null,
	}

	const roleNew = await new RoleModel(role).save();
	res.json(toObject(roleNew)).send();
});

router.delete("/:role_id", async (req: Request, res: Response) => {

    const guild_id = req.params.guild_id;
    const { role_id } = req.params;

	const guild = await GuildModel.findOne({ id: guild_id }, { id: true }).exec();
	if (!guild) throw new HTTPError("Guild not found", 404);
	if (!role_id) throw new HTTPError("Unknown role_id", 404);

	const user = await UserModel.findOne({ id: req.user_id }).exec();
	if (!user) throw new HTTPError("User not found", 404);

	const perms = await getPermission(req.user_id, guild_id);

	if (!perms.has("MANAGE_ROLES"))
		throw new HTTPError("You missing the MANAGE_ROLES permission", 401);

	await RoleModel.findOneAndDelete({
		id: role_id,
		guild_id: guild_id
	}).exec();

	res.send("Deleted");
});


router.patch("/:role_id", check(RoleModifySchema), async (req: Request, res: Response) => {
    const guild_id = req.params.guild_id;
    const { role_id } = req.params;

	const guild = await GuildModel.findOne({ id: guild_id }, { id: true }).exec();
	if (!guild) throw new HTTPError("Guild not found", 404);
	if (!role_id) throw new HTTPError("Unknown template_id", 404);

	const user = await UserModel.findOne({ id: req.user_id }).exec();
	if (!user) throw new HTTPError("User not found", 404);

	const role = await RoleModel.findOne({ id: role_id, guild_id: guild_id }).exec();
	if (!role) throw new HTTPError("role not found", 404);

	const perms = await getPermission(req.user_id, guild_id);

	if (!perms.has("MANAGE_ROLES"))
		throw new HTTPError("You missing the MANAGE_ROLES permission", 401);

	var roleObj = await RoleModel.findOneAndUpdate({
		id: role_id, guild_id: guild_id
	}, ...req.body).exec();

	res.json(toObject(roleObj)).send();
});


export default router;