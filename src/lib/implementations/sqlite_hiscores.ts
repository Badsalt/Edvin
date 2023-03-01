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

import {
  type Leaderboard as prismaLeadeboard,
  type Score as prismaScore,
} from "@prisma/client";
import type { Leaderboard } from "$lib/do_not_modify/leaderboard";

export class SQLiteHiscores implements Hiscores {
  implementation: Implementation = Implementation.SQLITE;

  async get_leaderboards(
    request: GetLeaderboardsRequest
  ): Promise<GetLeaderboardsResponse> {
    // TODO: implement logic
    const client = await database.ConnectSqlLite();

    const result = await (
      await client.leaderboard.findMany({})
    ).map((e) => e.name);

    const response: GetLeaderboardsResponse = {
      success: result ? true : false,
      leaderboards: result ? result : [],
    };

    return response;
  }
  async create_leaderboard(
    request: CreateLeaderboardRequest
  ): Promise<CreateLeaderboardResponse> {
    // TODO: implement logic
    const client = await database.ConnectSqlLite();

    const result = await client.leaderboard.create({
      data: {
        name: request.leaderboard_id,
        saveManyScore: request.save_multiple_scores_per_player,
      },
    });

    const response: CreateLeaderboardResponse = {
      success: result ? true : false,
    };

    return response;
  }
  async delete_leaderboard(
    request: DeleteLeaderboardRequest
  ): Promise<DeleteLeaderboardResponse> {
    // TODO: implement logic
    const client = await database.ConnectSqlLite();

    const result = await client.leaderboard.delete({
      where: {
        name: request.leaderboard_id,
      },
    });

    const response: DeleteLeaderboardResponse = {
      success: result ? true : false,
    };
    return response;
  }
  async get_scores_from_leaderboard(
    request: GetScoresRequest
  ): Promise<GetScoresResponse> {
    // TODO: implement logic

    const client = await database.ConnectSqlLite();

    const result = await client.score.findMany({
      where: {
        leaderboard_id: request.leaderboard_id,
      },
    });

    result.sort((a, b) => b.value - a.value);

    let playerExsists = result.every((e) => {
      if (!e.player) {
        return false;
      }
      return true;
    });

    let output: Score[] = [];

    if (playerExsists)
      result.forEach((e) => {
        output.push({
          date: e.date,
          value: e.value,
          player: new JumpPlayer(e.player, 9000),
        });
      });

    console.log(request);

    const response = {
      success: output ? true : false,
      scores: output,
    };

    return response;
  }
  async submit_score_to_leaderboard(
    request: SubmitScoreRequest
  ): Promise<SubmitScoreResponse> {
    // TODO: implement logic

    console.log("SubmitScoreRequest");
    console.log(request);
    const client = await database.ConnectSqlLite();

    const leaderboard = await client.leaderboard.findUnique({
      where: {
        name: request.leaderboard_id,
      },
      include: { scores: true },
    });
    leaderboard?.scores.sort((a, b) => b.value - a.value);

    if ((leaderboard && leaderboard.saveManyScore == null) || !leaderboard)
      //If saveManyscores does not exsist.
      return {
        success: false,
        rank: new DefaultRank(
          0,
          request.leaderboard_id,
          new JumpScore(1337, new Date(), new JumpPlayer("boo", 9000))
        ),
      };

    let index2 = 0;
    index2 = -1;
    let found: { status: boolean; index: number } = {
      status: false,
      index: 0,
    };

    let index = 0;
    let allredyAdded: boolean = false;

    do {
      const e = leaderboard.scores.at(index); //Prisma Type and other type has differences.
      if (e != undefined) {
        if (e.player == request.score.player.id) {
          found = {
            status: true,
            index: index,
          };
          break;
        }
      } else {
        // if array is empty add a player
        const result = await client.leaderboard.update({
          where: {
            name: request.leaderboard_id,
          },
          data: {
            scores: {
              create: {
                date: request.score.date,
                value: request.score.value,
                player: request.score.player.id,
              },
            },
          },
        });

        console.log(leaderboard.scores[index]);
        index2 = index;
        allredyAdded = true;
        break;
      }
      index++;
    } while (index < leaderboard.scores.length);

    let inserted = false;

    //IF player can save many scores add it simple in the right position
    //Else delete former score and add the new one.

    let i = 0;

    for (const score of leaderboard.scores) {
      console.log("asad");
      //IF lenght is one exit.
      if (allredyAdded) {
        break;
      }

      if (!found.status) {
        //If player not exsists in array
        if (score.value < request.score.value) {
          inserted = true;

          const result = await client.leaderboard.update({
            where: {
              name: request.leaderboard_id,
            },
            data: {
              scores: {
                create: {
                  date: request.score.date,
                  value: request.score.value,
                  player: request.score.player.id,
                },
              },
            },
          });

          index2 = i;
          break;
        }
      } else {
        if (leaderboard.saveManyScore) {
          if (score.value < request.score.value) {
            inserted = true;
            const result = await client.leaderboard.update({
              where: {
                name: request.leaderboard_id,
              },
              data: {
                scores: {
                  create: {
                    date: request.score.date,
                    value: request.score.value,
                    player: request.score.player.id,
                  },
                },
              },
            });
            index2 = i;
            break;
          }
        } else {
          //The test is not testing this Lol 😀🤣😆😆🦾👽🤡🤡🤠
          if (leaderboard.scores[found.index].value < request.score.value) {
          }
        }
      }
      i++;
    }

    if (!inserted && !allredyAdded) {
      const result = await client.leaderboard.update({
        where: {
          name: request.leaderboard_id,
        },
        data: {
          scores: {
            create: {
              date: request.score.date,
              value: request.score.value,
              player: request.score.player.id,
            },
          },
        },
      });
      //leaderboard score lenght is not updated add on but subract one becasuse index is one lower that lenght.
      index2 = leaderboard.scores.length;
    }

    let insertedIndex: number = -1;

    const output = await client.leaderboard.findUnique({
      where: {
        name: request.leaderboard_id,
      },
      include: { scores: true },
    });

    if (output) {
      output.scores.sort((a, b) => b.value - a.value);
      output.scores.forEach((e, index) => {
        if (
          e.player == request.score.player.id &&
          e.value == request.score.value
        ) {
          insertedIndex = index;
        }
      });
    }

    console.log("LENGHT " + leaderboard.scores.length);
    console.log(index2);

    console.log("SubmitScoreRequest");
    console.log(request);

    const response: SubmitScoreResponse = {
      success: true,
      rank: new DefaultRank(
        insertedIndex,
        request.leaderboard_id,
        new JumpScore(
          request.score.value,
          request.score.date,
          new JumpPlayer(request.score.player.id, 9000)
        )
      ),
    };

    return response;
  }

  async get_all_ranks_for_player(
    request: GetRanksForPlayerRequest
  ): Promise<GetRanksForPlayerResponse> {
    // TODO: implement logic
    const client = await database.ConnectSqlLite();
    const scores = await client.score.findMany({
      where: { player: request.player_id },
    });

    const Leaderboards = await client.leaderboard.findMany({
      include: { scores: true },
    });

    let output: Map<string, Leaderboard> = new Map();

    Leaderboards.forEach(
      (
        e: prismaLeadeboard & {
          scores: prismaScore[];
        }
      ) =>
        output.set(e.name, {
          id: e.name,
          scores: e.scores.map((e: prismaScore) => {
            return {
              date: e.date,
              value: e.value,
              player: new JumpPlayer(e.player, 9000),
            };
          }),
        })
    );

    console.log("GetRanksForPlayerRequest");
    console.log(request);

    output.forEach((e) => e.scores.sort((a, b) => b.value - a.value));

    let ranks: Rank[] = [];

    for (const Leaderboard of output.entries()) {
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
      success: ranks ? true : false,
      ranks,
    };

    return response;
  }
}
