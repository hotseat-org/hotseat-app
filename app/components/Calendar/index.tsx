import React, { useState } from "react"
import DayPicker, { DateUtils } from 'react-day-picker'


const Calendar = () => {
  const date = new Date()
  const [selectedDays, setSelectedDays] = useState<any>({from: undefined, to: undefined})
  const disabledDays: Date[] = []

  const onDayClick = (day: Date) => {
    const range = DateUtils.addDayToRange(day, selectedDays)
    setSelectedDays(range)
  }

  const handleReset = () => {
    setSelectedDays({from: undefined, to: undefined})
  }

  return (
    <div className="flex flex-col flex-center align-center w-60 h-60 white">
      
      <DayPicker
        className="Selectable"
        showOutsideDays
        initialMonth={date}
        modifiers={selectedDays}
        selectedDays={[selectedDays.from, selectedDays]}
        onDayClick={onDayClick}
        disabledDays={disabledDays}
      /> 
      {!selectedDays.from 
        ? <p className="text-red-400 text-center">Select a date</p> 
        : <button onClick={handleReset} className="center">reset</button>
      }
    </div>   
    
  )
}

export default Calendar