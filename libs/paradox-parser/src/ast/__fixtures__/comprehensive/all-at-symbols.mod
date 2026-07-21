@FTR_START = -5
@1933 = 100
technologies = {
	infantry = {
		@LOCAL = 3
		research_cost = @LOCAL
		folder = {
			position = { x = @FTR_START y = @1933 }
		}
		ai_will_do = {
			factor = variable@token
			scaled = @[ 1 + 2 ]
		}
		orphan = @UNDEFINED
	}
}
