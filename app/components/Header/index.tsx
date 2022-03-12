import React, { useState } from "react"
import ArrowRight from "../icons/ArrowRight";
import ArrowLeft from "../icons/ArrowLeft";
import dayjs from "dayjs";

const CONTAINER_STYLES = {
  width: '100%',
  height: '10px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

const Date = () => {
  const date = dayjs()
  const [showedDate, setShowedDate] = useState(date)
  

  const getPrevDay = () => {
    const newDate = dayjs(showedDate).subtract(1, 'day')
    setShowedDate(newDate)
  }

  const getNextDay= () => {
    const newDate = dayjs(showedDate).add(1, 'day')
    setShowedDate(newDate)
  }

  return (
    <div className="date">
      <div className="arrow" onClick={getPrevDay} >
        <ArrowLeft  />
      </div>
        {showedDate.format('dddd DD/MM/YYYY')}
      <div className="arrow" onClick={getNextDay} >
        <ArrowRight />  
      </div>
    </div>
  )
}

export default Date