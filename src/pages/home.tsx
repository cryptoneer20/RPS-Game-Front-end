import { useState, useEffect } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import axios from 'axios'
import { CONST_MESSAGES, WAGER_AMOUNTS } from '../utils/constant'
import {WalletConnect, WalletDisconnect} from '../wallet'
import {Alert, IconButton, Stack, CircularProgress} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import LogPanel from '../components/logpanel';
import Footer from '../components/footer'
import InfoPanel from '../components/infopanel';
import { LAMPORTS_PER_SOL, Connection} from '@solana/web3.js';
import {notification} from 'antd'

import BettingImage from '../assets/images/HERO.svg'
import LG_PAPER_LEFT  from '../assets/images/LG-PAPER-LEFT.svg'
import LG_ROCK_LEFT  from '../assets/images/LG-ROCK-LEFT.svg'
import LG_SCISSORS_LEFT  from '../assets/images/LG-SCISSORS-LEFT.svg'
import SM_PAPER_LEFT from '../assets/images/SM-PAPER-LEFT.svg'
import SM_ROCK_LEFT  from '../assets/images/SM-ROCK-LEFT.svg'
import SM_SCISSORS_LEFT  from '../assets/images/SM-SCISSORS-LEFT.svg'
import SM_PAPER_RIGHT from '../assets/images/SM-PAPER-RIGHT.svg'
import SM_ROCK_RIGHT  from '../assets/images/SM-ROCK-RIGHT.svg'
import SM_SCISSORS_RIGHT  from '../assets/images/SM-SCISSORS-RIGHT.svg'
import StarEmpty from '../assets/images/STAR-EMPTY.svg'
import StarWin1 from '../assets/images/STAR-WIN1.svg'
import StarWin2 from '../assets/images/STAR-WIN2.svg'
import RockIcon from '../assets/images/Rock.png'
import PaperIcon from '../assets/images/Paper.png'
import ScissorsIcon from '../assets/images/Scissors.png'

import * as nacl from 'tweetnacl'
import * as bs58 from 'bs58'
import { connect } from 'http2';
import { textAlign } from '@mui/material/node_modules/@mui/system';

let wallet : any;
const SEVERURL = "https://solnino.io/server/"

const RPSNAME = ['ROCK','PAPER', 'SCISSORS']
const RPSICON = [RockIcon, PaperIcon, ScissorsIcon]
const lgImage = [LG_ROCK_LEFT, LG_PAPER_LEFT, LG_SCISSORS_LEFT]
const smLeftImage = [SM_ROCK_LEFT, SM_PAPER_LEFT, SM_SCISSORS_LEFT]
const smRightImage = [SM_ROCK_RIGHT, SM_PAPER_RIGHT, SM_SCISSORS_RIGHT]

export default function Home(){
	wallet = useWallet()
	const prevUserName = localStorage.getItem("userName")
	const [openAlert, setOpenAlert] = useState(true)
	const [recentLog, setRecentLog] = useState<any[]>([])
	const [userName, setUserName] = useState<string>(prevUserName!==null && prevUserName!==undefined ? prevUserName : "")
	const [selectedAmount, setSelectedAmount] = useState(0)
	const [isCorrectName, setIsCorrectName] = useState(true)
	const [rpsStatus, setRpsStatus] = useState(0)
	const [selectItem, setSelectItem] = useState(0)
	const [isInvitePanel, setIsInvitePanel] = useState(false)
	const [isInviteWaiting, setIsInviteWaiting] = useState(false)
	const [isSelecting, setIsSelecting] = useState(true)
	const [currentState, setCurrentState] = useState<any>(null)
	const [roomNumber, setRoomNumber] = useState(0)
	const [inviteId, setInviteId] = useState(0)
	const [isSigned, setIsSigned] = useState(false)
	const [availableAmount, setAvailableAmount] = useState([0,0,0,0,0,0])

	const [depositAmount, setDepositAmount] = useState(0)

	const handleDepositAmount = (amount : number)=>{
		setDepositAmount(amount)
	}

	const [signMessageWaiting, setSignMessageWaiting] = useState(false)

	useEffect(()=>{
		if(wallet.connected) getSignStatus()
		if(wallet.connected && isSigned) getPlayerStatus()
		else{
			setIsSigned(false)
			const interval = setInterval(()=>{
				getGameLog()
			},10000)
			return ()=> clearInterval(interval)
		}
	},[wallet, wallet.connected, wallet.publicKey ,isSigned])

	useEffect(()=>{
		if(rpsStatus===0){
			const interval = setInterval(()=>{
				getAvailableAmount()
			}, 1000)
			return ()=>clearInterval(interval)
		}
		else if(rpsStatus===1){
			const interval = setInterval(()=>{
				findMatch()
			}, 1000)
			return ()=> clearInterval(interval)
		}else if(rpsStatus===2){
			const interval = setInterval(()=>{
				getGameState()
			},1000)
			return ()=> clearInterval(interval)
		}else if(rpsStatus===3){
			const interval =setInterval(()=>{
				getPlayerStatus()
			},1000)
			return ()=> clearInterval(interval)
		}
	},[rpsStatus])

	async function getSignStatus(){
		try{
			let token = localStorage.getItem("token")
			if(token!==null){
				try{
					let tokenCheck = await axios.post(SEVERURL+"rpsgame/tokencheck",{wallet : wallet.publicKey, token : token})
					if(tokenCheck.data.response===true){
						axios.defaults.headers.common["x-access-token"] = token
						setIsSigned(true)
						return;
					}
				}catch(err){
					console.log("Prev Token Invalid")
				}
			}		
		}catch(err){
			console.log(err)
		}
	}

	async function getAvailableAmount(){
		try{
			let response = await axios.get(SEVERURL+'rpsgame/available')
			if(response.data.response)
				setAvailableAmount(response.data.data)
		}catch(err){

		}
	}

	async function getGameLog(){
		try{
			let response = await axios.get(SEVERURL+'rpsgame/recentlog')
			console.log(response)
			if(response.data.response === false) throw new Error("Network Status is unstable")
			// let tempLog : any[];
			// (response.data.data as any[]).map((item,idx)=>{
			// 	tempLog.push({winnerName : item.winnerName, loserName : item.loserName, amount : item.amount/LAMPORTS_PER_SOL, result : item.result})
			// })
			setRecentLog(response.data.data)
		}catch(err){

		}
	}

	async function getPlayerStatus(){
		let res = await axios.get(SEVERURL+'rpsgame/status?wallet='+wallet.publicKey.toBase58())
		if(res.data.status===2){
			setRoomNumber(res.data.roomID)
		}
		if(res.data.status===3){
			setIsInviteWaiting(true)
		}
		setRpsStatus(res.data.status)
	}

	const openNotification = (type : 'success' | 'error' | 'info' | 'warning', title : string, description? : string) => {
		notification[type]({
			message : title, description : description, placement : 'topLeft'
		})
	}

	const startMystery = async()=> {
		try{
			if(depositAmount < WAGER_AMOUNTS[selectedAmount] * LAMPORTS_PER_SOL){
				openNotification('error', 'Your deposit amount is not enough')
				throw new Error("Amount Not enough")
			}
			// setIsWaiting(true)
			setRpsStatus(1)
			let response = await axios.post(SEVERURL+"rpsgame/start/mystery",{wallet : wallet.publicKey, amount : WAGER_AMOUNTS[selectedAmount] * LAMPORTS_PER_SOL, name : userName})
			if(response.data.response===false){
				openNotification('error',"You can't start game.", "Please check your wallet status and deposit amount")
				// setIsWaiting(false)
				setRpsStatus(0)
				throw new Error("Start game error")
			}
		}catch(err){
			console.log(err)
		}
	}

	const startInvite = async()=> {
		try{
			if(depositAmount < WAGER_AMOUNTS[selectedAmount] * LAMPORTS_PER_SOL){
				openNotification('error', 'Your deposit amount is not enough')
				throw new Error("Amount Not enough")
			}
			// setRpsStatus(1)
			let response = await axios.post(SEVERURL+"rpsgame/start/invite",{wallet : wallet.publicKey, amount : WAGER_AMOUNTS[selectedAmount] * LAMPORTS_PER_SOL, name : userName})
			if(response.data.response===false){
				openNotification('error',"You can't start game.", "Please check your wallet status and deposit amount")
				// setRpsStatus(0)
				throw new Error("Start game error")
			}
			setInviteId(response.data.data.id)
			setIsInvitePanel(true)
		}catch(err){
			console.log(err)
		}
	}

	const cancelGame = async()=> {
		try{
			let res = await axios.delete(SEVERURL+"rpsgame/cancel/mystery",{data:{wallet : wallet.publicKey}})
			if(res.data.response===false){
				openNotification('error',"You can't cancel game", "You have already matched or started game.")
				throw new Error("cannot cancel")
			}
			// setIsWaiting(false)			
			setRpsStatus(0)
		}catch(err){
			console.log(err)
		}
	}

	const findMatch = async()=> {
		// console.log(rpsStatus)
		// if(rpsStatus!==1) return;
		if(isInviteWaiting){
			await getPlayerStatus()
		}else{
			try{
				let res = await axios.post(SEVERURL+"rpsgame/match",{wallet : wallet.publicKey})
				if(res.data.response===true && res.data.roomID!==0){
					console.log("room created - ", res.data.data.roomID)
					setRoomNumber(res.data.data.roomID)
					setRpsStatus(2)
				}else{
					console.log("not found")
				}
			}catch(err){
				console.log(err)
			}
		}
	}

	const getGameState = async()=>{
		// if(rpsStatus!==2) return;
		try{
			if(wallet.connected===false) throw new Error("wallet invalid")
			let res = await axios.post(SEVERURL+'rpsgame/gamestate',{roomId : roomNumber, wallet : wallet.publicKey})
			if(res.data.response === false) throw new Error("Get game state failed")
			let gameState = res.data.data;
			
			if(gameState.ended===1 || gameState.mySel!==0){
				setIsSelecting(false)
			}
			if(gameState.myLastSelect===0 && gameState.mySel===0){
				setIsSelecting(true)
			}
			if(gameState.mySel!==0){
				setCurrentState({...gameState, myShow : gameState.mySel-1, opShow : 3})
			}else{
				setCurrentState({...gameState, myShow : gameState.myLastSelect-1, opShow : gameState.opLastSelect-1})
			}			
		}catch(err){
			console.log(err)
		}
	}

	const submitRps = async()=>{
		try{
			await axios.post(SEVERURL+'rpsgame/submit',{roomId : roomNumber, wallet : wallet.publicKey, item : (selectItem+1)})
		}catch(err){
			console.log(err)
		}
	}

	const signMessage = async() => {
		setSignMessageWaiting(true)
		try{
			let token = localStorage.getItem("token")
			if(token!==null){
				try{
					let tokenCheck = await axios.post(SEVERURL+"rpsgame/tokencheck",{wallet : wallet.publicKey, token : token})
					if(tokenCheck.data.response===true){
						axios.defaults.headers.common["x-access-token"] = token
						setIsSigned(true)
						setSignMessageWaiting(false)
						return;
					}
				}catch(err){
					console.log("Prev Token Invalid")
				}
			}
			let response = await axios.post(SEVERURL+"rpsgame/nonce",{wallet : wallet.publicKey})
			if(response.data.response===false){
				throw new Error("Nonce Error")
			}
			let nonce = response.data.nonce
			let message = `Sign this message from authentication with your wallet. Nonce : ${nonce}`
			const data = new TextEncoder().encode(message)
			const signature = bs58.encode(await wallet.signMessage(data))
			let signResponse = await axios.post(SEVERURL+"rpsgame/signin",{wallet : wallet.publicKey, signature : signature})
			console.log(signResponse)
			if(signResponse.data.response===false) throw new Error("sign error")
			axios.defaults.headers.common["x-access-token"] = signResponse.data.data.token
			localStorage.setItem("token", signResponse.data.data.token)
			setIsSigned(true)
			openNotification('success','Successfully signed')
		}catch(err){
			openNotification('error','Sign failed')
			console.log(err)
		}
		setSignMessageWaiting(false)
	}

	return <>
	<div className="content text-center">
		{
			openAlert &&
			<Alert severity="info" icon={false}
				action={
				<IconButton arial-label="close" color="inherit" size="small" onClick={()=>{
					setOpenAlert(false)
				}}>
					<CloseIcon fontSize="inherit"></CloseIcon>
				</IconButton>
				}
				sx={{margin : 0,borderRadius : 0, borderWidth : "1px", mb : 3, width: "100%", fontFamily:"IndustryBlack", textAlign : "center", fontSize : "16px"}}
			>{CONST_MESSAGES.chainDegradedAlert}</Alert>
		}
		<div className="header">
			<h3>{CONST_MESSAGES.title}</h3>
			<p>{CONST_MESSAGES.subTitle}</p>
			{wallet.connected && isSigned && <InfoPanel callback={handleDepositAmount}/>}
		</div>
		{
			wallet.connected===false || isSigned===false ?
				<>
					<img src={BettingImage} style={{width:'50%', maxWidth: "600px", minWidth : "300px", padding : "16px"}} alt={"betting"}/>
					<p style={{fontSize : "30px"}}>{CONST_MESSAGES.homeTitle}</p>
					{
						wallet.connected===false ?
							<div style={{width:"226px"}}><WalletConnect/></div>
						:
							<div style={{width:"226px"}}>
								<button className="btn-sign-message" disabled={signMessageWaiting} onClick={async()=>{await signMessage()}}>
								{signMessageWaiting ? <CircularProgress color="inherit" disableShrink></CircularProgress> : "SIGN MESSAGE"}
								</button>
							</div>
					}
					<div className='mb-5'></div>
					<p style={{fontSize : "28px", fontFamily:"IndustryMedium"}}>RECENT MATCHES</p>
					<Stack sx={{width:'100%', marginBottom : "40px"}} spacing={2}>
					{
						recentLog !=null &&
						recentLog.map((log,idx)=>{return <LogPanel log={log} key={idx}></LogPanel>})
					}
					</Stack>
				</>
			:
				<div className='play-panel'>
				{
					rpsStatus===0 ?
						isInvitePanel===false ?
							<div className="name-wager">
								<h5>ENTER DISPLAY NAME</h5>
								<input type="text" className={isCorrectName ? "" : "invalid-input"} maxLength={20} onChange={(event)=>{
									if(event.target.value==="") setIsCorrectName(false)
									else setIsCorrectName(true)
									setUserName(event.target.value)
								}} value={userName}></input>
								<h5 className='p-3'>SELECT YOUR WAGER</h5>
								<div className="row select-group">
								{
									WAGER_AMOUNTS.map((item,idx)=>{
										return <div className='col-4' key={idx}>
											<button type="button" className={idx===selectedAmount ? "btn btn-light active " : "btn btn-light " + (availableAmount[idx] > 0 ? "btn-available" : "")} onClick={()=>{setSelectedAmount(idx)}}>
											{
												availableAmount[idx] > 0 ?
													<u>{item} SOL</u>
												:
													<>{item} SOL</>
											}
											</button>
										</div>
									})
								}
								</div>
								<h5 className='p-3'>SELECT GAMEPLAY</h5>
								<div className='row'>
									<div className='col-sm-6 text-center mb-1'>
										<button className="btn-invite" onClick={async ()=>{
											if(isCorrectName===false){
												openNotification("error","Your name is invalid")
												return;
											}
											localStorage.setItem("userName", userName)
											localStorage.setItem("selectedAmount", selectedAmount.toString())
											await startInvite()
										}}>INVITE FRIEND</button>
									</div>
									<div className="col-sm-6 text-center">
										<button className="btn-mystery" onClick={async ()=>{
											if(isCorrectName===false){
												openNotification("error","Your name is invalid")
												return;	
											}
											localStorage.setItem("userName", userName)
											localStorage.setItem("selectedAmount", selectedAmount.toString())
											await startMystery()
										}}>MYSTERY PLAYER</button>
									</div>
								</div>
							</div>
						:
							<div className='invite-panel'>
								<h4>SHARE THIS LINK TO INVITE YOUR FRIEND TO PLAY</h4>
								<input disabled={true} type="text" value={"https://solnino.io/invite/"+inviteId}></input>
								<div className='row mt-4'>
									<div className='col-sm-6 text-center mb-1'>
										<button className="btn-mystery" onClick={async ()=>{
											navigator.clipboard.writeText("https://solnino.io/invite/"+inviteId)
										}}>COPY LINK</button>
									</div>
									<div className="col-sm-6 text-center">
										<button className="btn-invite" onClick={async ()=>{
											setIsInviteWaiting(true)
											setRpsStatus(1)
										}}>CONTINUE</button>
									</div>
								</div>
							</div>
					:
						(rpsStatus===1 || rpsStatus===3) ?
							<div className="waiting-room">
								<h2><HourglassBottomIcon fontSize='large'></HourglassBottomIcon>WAITING ROOM</h2>
								<h3>Please do not exit this screen</h3>
								<button className="btn-invite mt-5" onClick={async ()=>{
									await cancelGame()
									setIsInvitePanel(false)
								}}>CANCEL GAME</button>
							</div>
						:
							(currentState==null || isSelecting===true) ?
								<div className="mt-2 mb-2" style={{maxWidth:"600px"}}>
									<img src={lgImage[selectItem]} alt={"Selected"} style={{width : "100%", maxWidth : "300px"}}></img>
									<p className="normal-text">I'd LIKE TO PICK</p>
									<div className="row select-rps mt-5">
									{
										RPSNAME.map((item,idx)=>{
											return <div className="col-md-4" key={idx}>
												<button type="button" className={idx===selectItem ? "btn btn-light active" : "btn btn-light"} onClick={()=>{
													setSelectItem(idx)
												}}>{item}  <img src={RPSICON[idx]} alt="rock icon"></img></button>
											</div>
										})
									}
									</div>
									<button className="btn-mystery mt-4" onClick={async ()=>{
										await submitRps()
										await getGameState()
										setIsSelecting(false)
										await getGameState()
									}}>SUBMIT</button>
								</div>
							:
								<div className='mt-5 w-100'>
									<div className='row w-100 pair-group'>
										<div className='col-sm-6 one-group mb-3'>
											<button className="my-group-title">YOU SELECTED</button>
											<div className='sel-img'>
												<img style={{width:"280px"}} src={smLeftImage[currentState.myShow]} alt={"you selected"}></img>
											</div>
											<button className='one-group-sel mb-3'>{RPSNAME[currentState.myShow]}</button>
											<div>
												<img className="star-img m-1" src={currentState.myWinCount>0 ? StarWin1 : StarEmpty} alt="first star"></img>
												<img className="star-img" src={currentState.myWinCount===2 ? StarWin1 : StarEmpty} alt="second star"></img>
											</div>
										</div>
										<div className="col-sm-6 one-group mb-2">
											<button className="op-group-title">{currentState.opName+" SELECTED"}</button>
											<div className='sel-img'>
											{
												currentState.opShow !== 3 ?
													<img style={{width:"280px"}} src={smRightImage[currentState.opShow]} alt={"you selected"}></img>
												:
													<CircularProgress color="inherit" size="10rem" disableShrink></CircularProgress>
											}
											</div>
											<button className='one-group-sel mb-2'>{currentState.opShow!==3 ? RPSNAME[currentState.opShow] : "SELECTING..."}</button>			
											<div>
												<img className="star-img m-1" src={currentState.opWinCount>0 ? StarWin2 : StarEmpty} alt="first star"></img>
												<img className="star-img" src={currentState.opWinCount===2 ? StarWin2 : StarEmpty} alt="second star"></img>
											</div>
										</div>
									</div>
									{
										(currentState.opShow !== 3 && currentState.ended !== 1) &&
										<button className="btn-mystery mb-3 btn-next-round" onClick={()=>{
											setIsSelecting(true)
										}}>NEXT ROUND</button>
									}
									{
										currentState.ended === 1 &&
										<>
											
											{
												currentState.myWinCount===2 ? 
													<h4 className="text-green mb-2 won-title">YOU WON - {currentState.amount/(10**9)}SOL!</h4>
												:
													<h4 className="text-red mb-2 won-title">YOU LOST - {currentState.amount/(10**9)}SOL!</h4>
											}
											<button className="btn-mystery mb-5 btn-new-game" onClick={()=>{
												setIsSelecting(true)
												setCurrentState(null)
												setRpsStatus(0)
												setIsInvitePanel(false)
											}}>NEW GAME</button>
										</>
									}
								</div>
				}
				</div>
		}
	</div>
	<Footer/>
	</>
}