import bodyParser from "body-parser";
import express from "express";
import { BASE_NODE_PORT } from "../config";
import { Value } from "../types";

export async function node(
  nodeId: number, // the ID of the node
  N: number, // total number of nodes in the network
  F: number, // number of faulty nodes in the network
  initialValue: Value, // initial value of the node
  isFaulty: boolean, // true if the node is faulty, false otherwise
  nodesAreReady: () => boolean, // used to know if all nodes are ready to receive requests
  setNodeIsReady: (index: number) => void // this should be called when the node is started and ready to receive requests
) {
  const node = express();
  node.use(express.json());
  node.use(bodyParser.json());

  
  var answers = new Array(N).fill(null);
  var i = 0;
  let state: Value = initialValue;
  let decided = false;

  // TODO implement this
  // this route allows retrieving the current status of the node
  // node.get("/status", (req, res) => {});
  node.get("/status", (req, res) => {
    if (isFaulty) {
      res.status(500).send("faulty");
    } else {
      res.status(200).send("live");
    }
  });

  // TODO implement this
  // this route allows the node to receive messages from other nodes
  // node.post("/message", (req, res) => {});
  node.post("/message", (req, res) => {
    answers[i] = req.body.value;
    console.log(`Node ${nodeId} received a message:`, answers[i]);
    i++;
    if (i === N) {
      answers = new Array(N).fill(null);
      i = 0;
    }
  });

  // TODO implement this
  // this route is used to start the consensus algorithm
  // node.get("/start", async (req, res) => {});
  node.get("/start", async (req, res) => {
    res.status(200).send("started");
    while(!decided){
    if (!isFaulty && nodesAreReady()) {
       for (let ind = 0; ind < N; ind++) {
        if (ind !== nodeId) {
          fetch(`http://localhost:${BASE_NODE_PORT + ind}/message`, {
            method: "POST",
            body: JSON.stringify({ value: state }),
            headers: { "Content-Type": "application/json" },
          });
        }
        console.log(`Node ${nodeId} broadcasted a message:`, state);
      }
      const counts = new Map<Value, number>();
      answers.forEach((value) => {
        if (value !== null) {
          const count = counts.get(value) || 0;
          counts.set(value, count + 1);
        }
      });
      let decidedValue: Value | null = null;
      counts.forEach((count, value) => {
        if (count > F) {
          decidedValue = value;
        }
      });
      if (decidedValue !== null) {
        state = decidedValue;
        decided = true;
        console.log(`Node ${nodeId} value is:`, decidedValue);
      }
      else {
        if (Math.random() > 0.5) {state = 1;}
        else {state = 0;}}
    }
    else
    {
      console.log(`Node ${nodeId} not ready`);
      decided = true;
    }
  }
  }
  );

  // TODO implement this
  // this route is used to stop the consensus algorithm
  // node.get("/stop", async (req, res) => {});
  node.get("/stop", async (req, res) => {
    // TODO: stop the consensus algorithm
    decided = true;
    console.log(`Node ${nodeId} stopped`);
    res.status(200).send("stopped");
  });

  // TODO implement this
  // get the current state of a node
  // node.get("/getState", (req, res) => {});
  node.get("/getState", (req, res) => {
    const nodeState: NodeState = {
      killed: false,
      x: state,
      decided,
      k: null
    };

    if (isFaulty) {
      nodeState.x = null;
      nodeState.decided = null;
      nodeState.k = null;
    }

    res.status(200).json(nodeState);
  });

  // start the server
  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(
      `Node ${nodeId} is listening on port ${BASE_NODE_PORT + nodeId}`
    );

    // the node is ready
    setNodeIsReady(nodeId);
  });

  return server;
}
