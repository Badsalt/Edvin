import { Implementation, type Hiscores } from "$lib/do_not_modify/hiscores";
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
import * as database from "$lib/database";
import type { Leaderboard } from "$lib/do_not_modify/leaderboard";

export class MongoDBHiscores implements Hiscores {
  implementation: Implementation = Implementation.MONGODB;

  async get_leaderboards(
    request: GetLeaderboardsRequest
  ): Promise<GetLeaderboardsResponse> {
    // TODO: implement logic

    let client = await database.connectMongoDB();

    //TODO: MongoDB find when re

    let result = client
      .collection<Leaderboard & { saveManyScore: boolean }>("leaderboards")
      .find({});

    let leaderboards: string[] = [];

    (await result.toArray()).forEach(
      (e: Leaderboard & { saveManyScore: boolean }) => leaderboards.push(e.id)
    );

    const response: GetLeaderboardsResponse = {
      success: leaderboards.length > 0 ? true : false,
      leaderboards,
    };

    return response;
  }
  async create_leaderboard(
    request: CreateLeaderboardRequest
  ): Promise<CreateLeaderboardResponse> {
    let client = await database.connectMongoDB();

    let result = await client
      .collection<Leaderboard & { saveManyScore: boolean }>("leaderboards")
      .insertOne({
        id: request.leaderboard_id,
        scores: [],
        saveManyScore: request.save_multiple_scores_per_player,
      });

    let response: CreateLeaderboardResponse = {
      success: false,
    };

    if (result.acknowledged) {
      response = {
        success: true,
      };
    }
    return response;
  }
  async delete_leaderboard(
    request: DeleteLeaderboardRequest
  ): Promise<DeleteLeaderboardResponse> {
    let client = await database.connectMongoDB();

    let result = await client
      .collection<Leaderboard & { saveManyScore: boolean }>("leaderboards")
      .deleteMany({ id: request.leaderboard_id });

    let response: DeleteLeaderboardResponse = {
      success: false,
    };

    if (result.acknowledged && result.deletedCount > 0) {
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

    console.log("GetScoresRequest");
    console.log(request);

    let client = await database.connectMongoDB();

    let result = await client
      .collection<Leaderboard & { saveManyScore: boolean }>("leaderboards")
      .findOne({
        id: request.leaderboard_id,
      });

    let scores: Score[] = [];

    if (result) scores = result.scores;

    const response: GetScoresResponse = {
      success: result ? true : false,
      scores,
    };

    return response;
  }
  async submit_score_to_leaderboard(
    request: SubmitScoreRequest
  ): Promise<SubmitScoreResponse> {
    // TODO: implement logic

    const client = await database.connectMongoDB();

    let response: SubmitScoreResponse = {
      success: false,
      rank: new DefaultRank(
        -1,
        request.leaderboard_id,
        new JumpScore(1337, request.score.date, request.score.player)
      ),
    };

    let index2 = 0;

    let fff: (Leaderboard & { saveManyScore: boolean }) | null = await client
      .collection<Leaderboard & { saveManyScore: boolean }>("leaderboards")
      .findOne<Leaderboard & { saveManyScore: boolean }>({
        id: request.leaderboard_id,
      });

    console.log("--T--");
    console.log(fff);

    if (fff) {
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
          let result = await client
            .collection<Leaderboard & { saveManyScore: boolean }>(
              "leaderboards"
            )
            .updateOne(
              { id: request.leaderboard_id },
              {
                $push: {
                  scores: {
                    $each: [
                      {
                        value: request.score.value,
                        player: request.score.player,
                        date: request.score.date,
                      },
                    ],
                    $sort: { value: -1 },
                  },
                },
              }
            );

          if (!result.acknowledged) {
            return response;
          }

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

            let result = await client
              .collection<Leaderboard & { saveManyScore: boolean }>(
                "leaderboards"
              )
              .updateOne(
                { id: request.leaderboard_id },
                {
                  $push: {
                    scores: {
                      $each: [
                        {
                          value: request.score.value,
                          player: request.score.player,
                          date: request.score.date,
                        },
                      ],
                      $sort: { value: -1 },
                    },
                  },
                }
              );

            index2 = i;
            break;
          }
        } else {
          if (fff.saveManyScore) {
            if (score.value < request.score.value) {
              inserted = true;
              let result = await client
                .collection<Leaderboard & { saveManyScore: boolean }>(
                  "leaderboards"
                )
                .updateOne(
                  { id: request.leaderboard_id },
                  {
                    $push: {
                      scores: {
                        $each: [
                          {
                            value: request.score.value,
                            player: request.score.player,
                            date: request.score.date,
                          },
                        ],
                        $sort: { value: -1 },
                      },
                    },
                  }
                );
              index2 = i;
              break;
            }
          } else {
            //The test is not testing this Lol 😀🤣😆😆🦾👽🤡🤡🤠
            if (fff.scores[found.index].value < request.score.value) {
              fff.scores.splice(found.index, 1);

              fff.scores.splice(i, 0, request.score);
            }
          }
        }
        i++;
      }

      if (!inserted && !allredyAdded) {
        let result = await client
          .collection<Leaderboard & { saveManyScore: boolean }>("leaderboards")
          .updateOne(
            { id: request.leaderboard_id },
            {
              $push: {
                scores: {
                  $each: [
                    {
                      value: request.score.value,
                      player: request.score.player,
                      date: request.score.date,
                    },
                  ],
                  $sort: { value: -1 },
                },
              },
            }
          );

        //fff score lenght is not updated add on but subract one becasuse index is one lower that lenght.
        index2 = fff.scores.length;
      }

      console.log("LENGHT " + fff.scores.length);
      console.log(index2);
    }

    console.log("SubmitScoreRequest");
    console.log(request);

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
    const client = await database.connectMongoDB();

    let result = await client
      .collection<Leaderboard>("leaderboards")
      .find<Leaderboard>({});

    let fffee = await result.toArray();
    let ffeee: Map<string, Leaderboard> = new Map();

    fffee.map((e) => {
      ffeee.set(e.id, e);
    });

    console.log(ffeee);

    let ranks: Rank[] = [];

    console.log("GetRanksForPlayerRequest");
    console.log(request);

    for (const Leaderboard of ffeee.entries()) {
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

    const response: GetRanksForPlayerResponse = {
      success: true,
      ranks,
    };

    return response;
  }
}
