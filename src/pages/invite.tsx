import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {WalletConnect, WalletDisconnect} from '../wallet'
import axios from 'axios'
import { CONST_MESSAGES } from '../utils/constant'
import { useWallet } from "@solana/wallet-adapter-react";
import {Alert, Stack, IconButton, CircularProgress} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {notification} from 'antd'
import BettingImage from '../assets/images/HERO.svg'
import LogPanel from '../components/logpanel';
import Footer from '../components/footer'
import InfoPanel from '../components/infopanel';
import * as bs58 from 'bs58'

const SEVERURL = "https://solnino.io/server/"
let wallet : any;

export default function Invite(){
	wallet = useWallet()
	const {id} = useParams()
	const prevUserName = localStorage.getItem("userName")

	const [openAlert, setOpenAlert] = useState(true)
	const [amount, setAmount] = useState(0)
	const [userName, setUserName] = useState<string>(prevUserName!==null && prevUserName!==undefined ? prevUserName : "")
	const [isCorrectName, setIsCorrectName] = useState(true)
	const [isSigned, setIsSigned] = useState(false)
	const [signMessageWaiting, setSignMessageWaiting] = useState(false)
	const [depositAmount, setDepositAmount] = useState(0)
	const [invitationInfo, setInvitationInfo] = useState<any>(null)

	const handleDepositAmount = (amount : number)=>{
		setDepositAmount(amount)
	}

	useEffect(()=>{
		getInvitationInfo()
	},[])

	useEffect(()=>{
		if(wallet.connected && isSigned) getPlayerStatus()
		else{
			setIsSigned(false)
		}
	},[wallet, wallet.connected, wallet.publicKey, isSigned])

	function returnMainPage(){
		window.location.href = '/'
	}

	async function getPlayerStatus(){
		let res = await axios.get(SEVERURL+'rpsgame/status?wallet='+wallet.publicKey.toBase58())
		if(res.data.status!==0){
			openNotification('warning',"You can not access the invitation", 'You are not idle', returnMainPage)
		}
	}

	const openNotification = (type : 'success' | 'error' | 'info' | 'warning', title : string, description? : string, callback? : any) => {
		notification[type]({
			message : title, description : description, placement : 'topLeft',
			onClose : callback
		})
	}

	const getInvitationInfo = async() => {
		try{
			let response = await axios.get(SEVERURL+"rpsgame/invitation?inviteId="+id)
			console.log(response)
			if(response.data.response===true){
				setInvitationInfo(response.data.data)
			}else{
				openNotification('warning', "You can not access the invitation", 'This invitation maybe closed or matched', returnMainPage)
			}
		}catch(err){
			console.log(err)
		}
	}

	const acceptInvitation = async()=>{
		try{
			if(depositAmount < invitationInfo.amount){
				openNotification('error', 'Your deposit amount is not enough')
				throw new Error("Amount Not enough")
			}
			let response = await axios.post(SEVERURL+"rpsgame/accept", {wallet : wallet.publicKey, name : userName, inviteId : id})
			if(response.data.response===true){
				window.location.href = "/"
			}else{
				openNotification('error', "You can not accept the invitation")
				getInvitationInfo()
			}
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
			wallet.connected===false || isSigned===false || invitationInfo===null ?
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
				</>
			:
				<div className="play-panel">
					<div className="name-wager">
						<h5><span className="text-red">{invitationInfo.name}</span>  HAS  BET  <span className="text-green">{invitationInfo.amount/(10**9)}</span> SOL</h5>
						<h5>ENTER DISPLAY NAME</h5>
						<input type="text" className={isCorrectName ? "" : "invalid-input"} maxLength={20} onChange={(event)=>{
							if(event.target.value==="") 
								setIsCorrectName(false)
							else
								setIsCorrectName(true)
							setUserName(event.target.value)
						}} value={userName}></input>
						<div className="invitation-alert">
							<p>If you do not have enough SOL in your wallet</p>
							<p> please deposit more funds to proceed</p>
						</div>
						<div className="row mt-3">
							<div className='col-sm-6 text-center mb-1'>
								<button className="btn-match" onClick={async ()=>{
									if(isCorrectName===false){
										openNotification("error","Your name is invalid")
										return;
									}
									localStorage.setItem("userName", userName)
									await acceptInvitation()
								}}>MATCH BET</button>
							</div>
							<div className="col-sm-6 text-center">
								<button className="btn-mystery" onClick={async ()=>{
									returnMainPage()
								}}>RETURN HOME</button>
							</div>
						</div>
					</div>
				</div>
		}
	</div>
	<Footer/>
	</>
}