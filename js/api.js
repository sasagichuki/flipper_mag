function getCurrentPageURL()
{
	var first_child = $(":jqmData(mirage='" + window.Atmosphere.current + "')").find(".LowResolution:first-child").LowResolution().data("LowResolution").page["@href"];
	var last_child = $(":jqmData(mirage='" + window.Atmosphere.current + "')").find(".LowResolution:last-child").LowResolution().data("LowResolution").page["@href"];
	if (window.Install.pages_per_mirage == 1) return first_child;
	else if (window.Install.pages_per_mirage == 2)
	{
		if (window.Install.tangent == "Differentiable") {
			if (first_child != null) return first_child;
			else return last_child;
		} else if (window.Install.tangent == "Integral") {
			if (last_child != null) return last_child;
			else return first_child;
		}
	}
}
