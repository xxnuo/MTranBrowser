export default function Header() {
	const version = process.env.APP_VERSION;

	return (
		<h1 className="text-2xl font-semibold tracking-tight text-foreground">
			MTranBrowser{" "}
			<span className="text-xs font-medium text-muted-foreground">
				V{version}
			</span>
		</h1>
	);
}
