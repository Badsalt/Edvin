import { Implementation, type Hiscores } from "$lib/do_not_modify/hiscores";
import type { Leaderboard } from "$lib/do_not_modify/leaderboard";
import { JumpPlayer } from "$lib/do_not_modify/player";
import { DefaultRank, type Rank } from "$lib/do_not_modify/rank";
import type {
  GetLeaderboardsRequest,
  GetLeaderboardsResponse,
  CreateLeaderboardRequest,
  CreateLeaderboardResponse,
  DeleteLeaderboardRequest,
  DeleteLeaderboardResponse,
  GetScoresRequest,
  GetScoresResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
  GetRanksForPlayerRequest,
  GetRanksForPlayerResponse,
} from "$lib/do_not_modify/requests";
import { JumpScore, type Score } from "$lib/do_not_modify/score";
import type { BlobOptions } from "buffer";
import { stat } from "fs";

let leaderboards: Map<string, Leaderboard> = new Map<string, Leaderboard>();

/**
 * Saves if one User can save multiple scores in one leaderboard
 *
 */
let manyScoreLeaderboards: Map<string, boolean> = new Map<string, boolean>();
export class InMemoryHiscores implements Hiscores {
  implementation: Implementation = Implementation.INMEMORY;

  /**
   *
   * @param request
   * @returns
   */
  async get_leaderboards(
    request: GetLeaderboardsRequest
  ): Promise<GetLeaderboardsResponse> {
    //console.log("GetLeaderboardsResponse");
    //console.log(request);

    const response: GetLeaderboardsResponse = {
      success: true,
      leaderboards: [...leaderboards.keys()],
    };

    return response;
  }

  async create_leaderboard(
    request: CreateLeaderboardRequest
  ): Promise<CreateLeaderboardResponse> {
    // TODO: implement logic

    manyScoreLeaderboards.set(
      request.leaderboard_id,
      request.save_multiple_scores_per_player
    );

    //TOOD: Create Leaderboard

    //console.log("CreateLeaderboardRequest");
    //console.log(request);

    leaderboards.set(request.leaderboard_id, {
      id: request.leaderboard_id,
      scores: [],
    });

    const response: CreateLeaderboardResponse = {
      success: true,
    };

    return response;
  }
  async delete_leaderboard(
    request: DeleteLeaderboardRequest
  ): Promise<DeleteLeaderboardResponse> {
    // TODO: implement logic

    //console.log("DeleteLeaderboardRequest");
    //console.log(request);

    let removed: boolean = leaderboards.delete(request.leaderboard_id);

    let response: DeleteLeaderboardResponse = { success: false };
    if (removed) {
      response = {
        success: true,
      };
    }

    return response;
  }
  async get_scores_from_leaderboard(
    request: GetScoresRequest
  ): Promise<GetScoresResponse> {
    // TODO: implement logic

    //console.log("GetScoresRequest");
    //console.log(request);

    let test2: Leaderboard | undefined = leaderboards.get(
      request.leaderboard_id
    );

    let response: GetScoresResponse = {
      success: false,
      scores: [],
    };

    if (test2) {
      let fff: Score[] = test2.scores.slice(
        request.start_index,
        request.end_index
      );
      response = {
        success: true,
        scores: fff,
      };
    }

    return response;
  }
  async submit_score_to_leaderboard(
    request: SubmitScoreRequest
  ): Promise<SubmitScoreResponse> {
    // TODO: implement logic

    //console.log("SubmitScoreRequest");
    //console.log(request);

    let fff: Leaderboard | undefined = leaderboards.get(request.leaderboard_id);

    let index2: number;

    let response: SubmitScoreResponse = {
      success: false,
      rank: new DefaultRank(
        -1,
        "",
        new JumpScore(1337, request.score.date, request.score.player)
      ),
    };

    if (fff) {
      //TODO: Sort list based on value

      fff.scores.sort((a, b) => b.value - a.value);

      let save_multiple_scores_per_player: boolean | undefined =
        manyScoreLeaderboards.get(request.leaderboard_id);

      index2 = -1;
      let found: { status: boolean; index: number } = {
        status: false,
        index: 0,
      };

      let index = 0;
      let allredyAdded: boolean = false;

      do {
        const e: Score | undefined = fff.scores.at(index);
        if (e != undefined) {
          if (e.player.id == request.score.player.id) {
            found = {
              status: true,
              index: index,
            };
            break;
          }
        } else {
          // if array is empty add a player
          fff.scores.splice(index, 0, request.score);
          console.log(fff.scores[index]);
          index2 = index;
          allredyAdded = true;
          break;
        }
        index++;
      } while (index < fff.scores.length);

      let inserted = false;

      //IF player can save many scores add it simple in the right position
      //Else delete former score and add the new one.

      let i = 0;

      for (const score of fff.scores) {
        console.log("asad");
        //IF lenght is one exit.
        if (allredyAdded) {
          break;
        }

        if (!found.status) {
          //If player not exsists in array
          if (score.value < request.score.value) {
            inserted = true;
            fff.scores.splice(i, 0, request.score);
            index2 = i;
            break;
          }
        } else {
          if (save_multiple_scores_per_player) {
            if (score.value < request.score.value) {
              inserted = true;
              fff.scores.splice(i, 0, request.score);
              index2 = i;
              break;
            }
          } else {
            if (fff.scores[found.index].value < request.score.value) {
              fff.scores.splice(found.index, 1);
              fff.scores.splice(i, 0, request.score);
            }
          }
        }
        i++;
      }

      if (!inserted && !allredyAdded) {
        fff.scores.push(request.score);
        index2 = fff.scores.length - 1;
      }

      fff.scores.sort((a, b) => b.value - a.value);

      console.log("LENGHT " + fff.scores.length);
      console.log(index2);
    } else {
      return response;
    }
    //Return index

    response = {
      success: true,
      rank: new DefaultRank(
        index2, //FIX:
        request.leaderboard_id,
        new JumpScore(
          request.score.value,
          request.score.date,
          request.score.player
        )
      ),
    };
    return response;
  }

  async get_all_ranks_for_player(
    request: GetRanksForPlayerRequest
  ): Promise<GetRanksForPlayerResponse> {
    // TODO: implement logic

    //console.log("GetRanksForPlayerRequest");
    //console.log(request);

    let ranks: Rank[] = [];

    let response: GetRanksForPlayerResponse = {
      success: false,
      ranks: [],
    };

    for (const Leaderboard of leaderboards.entries()) {
      for (const score of Leaderboard[1].scores) {
        if (score.player.id == request.player_id) {
          const prep: Rank = {
            index: Leaderboard[1].scores.findIndex(
              (value) => value.value == score.value
            ),
            leaderboard_id: Leaderboard[0],
            score: score,
          };

          ranks.unshift(prep);
        }
      }
    }

    if (!ranks) return response;

    response = {
      success: true,
      ranks: ranks,
    };

    return response;
  }
}
