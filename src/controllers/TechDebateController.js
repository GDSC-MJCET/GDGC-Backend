import Club from "../models/Club.js"
import Debate from "../models/Debate.js"
import {success, z} from "zod"

export const TechDebateController = {
    formSubmit:async(req,res)=>{
        try {
            const teamMemberSchema = z.object({
                name:z.string(),
                rollNo:z.string(),
                isLeader:z.boolean()
            });
            const requiredBody = z.object({
                clubName:z.string(),
                teamMembers:z.array(teamMemberSchema),
                clubImageUrl:z.string()
            })
            const testBody = requiredBody.safeParse(req.body);
            if(!testBody.success){
                return res.status(401).json({
                    message:"improper credentials",
                    error:testBody.error
                })
            }
            const {clubName,teamMembers,clubImageUrl} = req.body;
            await Club.create({
                clubName,
                teamMembers,
                clubImageUrl
            })
            res.status(200).json({
                success:true,
            })
            

        } catch (error) {
            res.status(500).json({
                message:error.message
            })
        }

    },
    startDebate: async (req, res) => {
        try {
            const { leftTeam, rightTeam, Topic,status } = req.body;
            if (!leftTeam || !rightTeam || !Topic || leftTeam === rightTeam) {
                return res.status(400).json({ "error": "Please Type All Fields" });
            }
            try {
                const leftteam = await Club.findOne({clubName:leftTeam})
                const rightteam= await Club.findOne({clubName:rightTeam})
                const alreadyExists = await Debate.findOne({
                    leftTeam: { $in: [leftteam._id, rightteam._id] },
                    rightTeam: { $in: [leftteam._id, rightteam._id] }
            });
                // if(alreadyExists){
                //     return res.status(400).json({"error":"A debate between these two teams already exists"})
                // }
                const debate = await new Debate({
                    leftTeam:leftteam._id,
                    rightTeam:rightteam._id,
                    Topic,
                    status,
                    isLive:true,
                }).save();
                return res.status(201).json({ "Success": true, debate });
            } catch (error) {
                return res.status(404).json({ "error": error.message });
            }

        } catch (err) {
            return res.status(500).json({ "error": err.message });
        }
    },
    endDebate: async (req, res) => {
        try {

            const { leftTeam,rightTeam} = req.body;
            const right= await Club.findOne({clubName:rightTeam.clubName})
            const left = await Club.findOne({clubName:leftTeam.clubName})
            console.log(right , left)
            const debate = await Debate.findOne({leftTeam:left._id,rightTeam:right._id})
            let winner;
            // console.log("hello" , debate , right , left)
            if (debate.rightScore == debate.leftScore) {
                return res.status(408).json({
                    "message" : "you cannot end the debate unless one has more points" , 
                })
            } else if (debate.rightScore > debate.leftScore) {
                debate.winner = right._id;
                winner = right;
            }else{
                debate.winner=left._id;
                winner=left;
            }
            debate.isLive=false
            await debate.save()
            return res.status(200).json({
                success: true,
                message: "success",
                "Winner team": winner.clubName
            })
    }catch(err){
        return res.status(500).json({"error":err.message})
    }
},
increment: async (req, res) => {
  try {
    const { leftTeam, rightTeam, side } = req.body;

    // Basic validation
    if (!leftTeam || !rightTeam || !side) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Decide which score field to increment
    const field = side === "left" ? "leftScore" : "rightScore";
    let updatedDebate;
    try {
        let leftTeamDoc = await Club.findOne({ clubName: leftTeam });
        let rightTeamDoc = await Club.findOne({ clubName: rightTeam });
        if (!leftTeamDoc || !rightTeamDoc) {
          return res.status(404).json({
            success: false,
            message: "One or both teams not found",
          });
        }
     if (side=="left") {
         updatedDebate = await Debate.findOneAndUpdate(
        { leftTeam: leftTeamDoc._id, rightTeam: rightTeamDoc._id },
        { $inc: { leftScore: 1 } },
        { new: true }
      );
      console.log("Left score incremented",updatedDebate
      )
     } else {
         updatedDebate = await Debate.findOneAndUpdate(
        { leftTeam: leftTeamDoc._id, rightTeam: rightTeamDoc._id },
        { $inc: { rightScore: 1 } },
        { new: true }
    );
    console.log("Right score incremented")
     }
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: "Database update failed",
        error: dbError.message,
      });
    }
    if (!updatedDebate) {
      return res.status(404).json({
        success: false,
        message: "Debate not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Score incremented successfully",
      updatedDebate,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
},
getScore : async (req,res) => {
  //find debate using left and right team, then return the whole debate object 
  let debate;
  let leftTeamClub;
  let rightTeamClub;
 try {
    debate = await Debate.findOne({isLive:true})
    if(!debate){
        return res.status(200).json({"error":"No live debate found"})
    }
    leftTeamClub = await Club.findOne({_id:debate.leftTeam})
    rightTeamClub = await Club.findOne({_id:debate.rightTeam})
   if (!debate) {
     return res.status(400).json({"error":"error finding the debate"})
   }
 } catch (error) {
  return res.status(400).json({"error":error.message})
 }


 const sendingData = {
    Topic : debate.Topic,
    isLive : debate.isLive,
    status : debate.status,
    leftTeam:leftTeamClub.clubName,
    rightTeam:rightTeamClub.clubName,
    speakersLeft:leftTeamClub.teamMembers,
    speakersRight:rightTeamClub.teamMembers,
    leftLogo:leftTeamClub.clubImageUrl,
    rightLogo:rightTeamClub.clubImageUrl,
    date:debate.createdAt,
    leftScore:debate.leftScore,
    rightScore:debate.rightScore,
    votesLeft:debate.votesLeft,
    votesRight:debate.votesRight,
    break:debate.break

 }
 return res.status(200).json({"success":"true",sendingData})
}
,
getClubs: async (req,res) => {
    try {
        const clubs = await Club.find({});      
        return res.status(200).json({"success":true,clubs})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
createDebatesfortesting: async (req,res) => {
    //i wanna create atlesast 5 debates, so i will create ten clubs in this controller and also five debates between them, this is just for testing purposes, i will not use this controller in production
    try {
        const clubNames = ["Club A", "Club B", "Club C", "Club D", "Club E", "Club F", "Club G", "Club H", "Club I", "Club J"];
        const clubs = [];   
        for (let i = 0; i < clubNames.length; i++) {
            const club = await Club.create({
                clubName: clubNames[i],
                teamMembers: [
                    { name: `Member 1 of ${clubNames[i]}`, rollNo: `00${i}1`, isLeader: true },
                    { name: `Member 2 of ${clubNames[i]}`, rollNo: `00${i}2`, isLeader: false },
                    { name: `Member 3 of ${clubNames[i]}`, rollNo: `00${i}3`, isLeader: false },    
                ],
                clubImageUrl: `https://example.com/${clubNames[i].toLowerCase().replace(/ /g, "")}.png`
            });
            clubs.push(club);
        }
        const debatesData = [
            { leftTeam: clubs[0]._id, rightTeam: clubs[1]._id, Topic: "Topic 1" },
            { leftTeam: clubs[2]._id, rightTeam: clubs[3]._id, Topic: "Topic 2" },
            { leftTeam: clubs[4]._id, rightTeam: clubs[5]._id, Topic: "Topic 3" },
            { leftTeam: clubs[6]._id, rightTeam: clubs[7]._id, Topic: "Topic 4" },
            { leftTeam: clubs[8]._id, rightTeam: clubs[9]._id, Topic: "Topic 5" },
        ];
        for (let i = 0; i < debatesData.length; i++) {
            await Debate.create(debatesData[i]);
        }
        return res.status(200).json({"success":true})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }   
},
deleteAllDebateDocuments: async (req,res) => {
    try {
        await Debate.deleteMany({});
        return res.status(200).json({"success":true,"message":"All debate documents deleted successfully"})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
deleteAllClubDocuments: async (req,res) => {
    try {
        await Club.deleteMany({});
        return res.status(200).json({"success":true,"message":"All club documents deleted successfully"})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
vote: async (req,res) => {
   
    try{
        const {leftTeam,rightTeam,side} = req.body;
        if(!leftTeam || !rightTeam || !side){
            return res.status(400).json({"error":"Missing required fields"})
        }
        const field = side === "left" ? "votesLeft" : "votesRight";
        const leftClub = await Club.findOne({clubName:leftTeam})
        const rightClub = await Club.findOne({clubName:rightTeam})
        let debate=await Debate.findOneAndUpdate(
            {leftTeam:leftClub._id,rightTeam:rightClub._id,isLive:true
            },
            {$inc:{[field]:1}},
            {new:true}
        )
        if(!debate){
            return res.status(400).json({"error":"Debate not found"})
        }
            const updatedDebate = {
            Topic : debate.Topic,
            leftTeam: leftClub.clubName,
            rightTeam: rightClub.clubName,
            votesLeft: debate.votesLeft,
            votesRight: debate.votesRight,
            leftScore: debate.leftScore,
            rightScore: debate.rightScore,
            leftLogo: leftClub.clubImageUrl,
            rightLogo: rightClub.clubImageUrl,
            speakersLeft: leftClub.teamMembers,
            speakersRight: rightClub.teamMembers,
            status: debate.status,
                date: debate.createdAt
            
        }
        return res.status(200).json({"success":true,"updatedDebate":updatedDebate})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
history: async (req, res) => {

    try {
        const debates = await Debate.find({isLive:false}).sort({ updatedAt: -1 }); 
        
        if (!debates || debates.length === 0) {
            return res.status(200).json({ 
                message: "No debates found",
                history: []
            });
        }
        
        const historyData = await Promise.all(debates.map(async (debate) => {
            const leftTeamInfo = await Club.findById(debate.leftTeam);
            const rightTeamInfo = await Club.findById(debate.rightTeam);
            
            // Handle missing clubs
            if (!leftTeamInfo || !rightTeamInfo) {
                console.error(`Missing club info for debate: ${debate._id}`);
                return null;
            }
            
            console.log("------------------------------------")
            console.log("this the logs nessesary need to check")
            console.log(leftTeamInfo.clubName)
            console.log(rightTeamInfo.clubName)
            
            // FIX: Handle null winner
            let winnerName = null;
            if (debate.winner) {
                const clook = await Club.findById(debate.winner).select("clubName");
                winnerName = clook?.clubName || null;
                console.log(winnerName, "clubName")
            } else {
                console.log("No winner set for this debate")
            }
            console.log("-------------------------------------")

            return {
                _id: debate._id,
                topic: debate.Topic,
                date: debate.updatedAt,
                leftTeam: {
                    name: leftTeamInfo.clubName,
                    members: leftTeamInfo.teamMembers?.map(member => ({
                        name: member.name,
                        isLeader: member.isLeader
                    })) || [],
                    image: leftTeamInfo.clubImageUrl
                },
                rightTeam: {
                    name: rightTeamInfo.clubName,
                    members: rightTeamInfo.teamMembers?.map(member => ({
                        name: member.name,
                        isLeader: member.isLeader
                    })) || [],
                    image: rightTeamInfo.clubImageUrl
                },
                leftScore: debate.leftScore,
                rightScore: debate.rightScore,
                winner: winnerName, // FIX: Now just the string clubName or null
                isLive: debate.isLive,
                status: debate.status,
                endDate: debate.updatedAt,
                startDate: debate.createdAt
            };
        }));
        
        // Filter out null entries
        const validHistory = historyData.filter(item => item !== null);
        
        console.log("this is the history data", validHistory)
        
        // FIX: Remove () - historyData is an array, not a function
        return res.status(200).json({
            success: true, 
            history: validHistory
        });
    } catch (error) {
        console.error("Error in history route:", error);
        return res.status(500).json({ 
            message: error.message
        });
    }
},
pauseDebate : async (req,res) => {
    try {
        const { leftTeam, rightTeam } = req.body;
        const right= await Club.findOne({clubName:rightTeam})
        const left = await Club.findOne({clubName:leftTeam})
        const debate = await Debate.findOneAndUpdate(
            {leftTeam:left._id,rightTeam:right._id},
            {break:true},
            {new:true}
        )
        return res.status(200).json({"success":true,"debate":debate})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
resumeDebate : async (req,res) => { 
    try {
        const { leftTeam, rightTeam } = req.body;
        const right= await Club.findOne({clubName:rightTeam})
        const left = await Club.findOne({clubName:leftTeam})
        const debate = await Debate.findOneAndUpdate(
            {leftTeam:left._id,rightTeam:right._id},
            {break:false},
            {new:true}
        )
        return res.status(200).json({"success":true,"debate":debate})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }   
},

endCurrentDebate : async (req,res) => {
    try {
        const debate = await Debate.findOneAndUpdate(
            {isLive:true},
            {isLive:false},
            {new:true}
        )   
        if(!debate){
            return res.status(404).json({"error":"No live debate found"})
        }
        return res.status(200).json({"success":true,"debate":debate})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
makeTheDebateLiveAgain : async (req,res) => {
  //the debate id will be given , i want to alive it
    try {
        const { debateId } = req.body;
        const debate = await Debate.findByIdAndUpdate(
            debateId,
            {isLive:true},
            {new:true}
        )
        if(!debate){
            return res.status(404).json({"error":"Debate not found"})
        }
        return res.status(200).json({"success":true,"debate":debate})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }

},
getClubIdUsingName : async (req,res) => {
   //in the club , just retreive all the clubs and their ids 
    try {
        const clubs = await Club.find({}).select("clubName _id");
        return res.status(200).json({"success":true,clubs})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
},
allhistory: async (req,res) => {
    //i want all the debates sorted in oldest first order , all the debates that exists in  db
    try {
        const debates = await Debate.find({}).sort({ createdAt: 1 }); 
        return res.status(200).json({"success":true,debates})
    } catch (error) {
        return res.status(500).json({"error":error.message})
    }
}
}