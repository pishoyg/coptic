/*
 * IbycusId.h: IbycusId class --
 *    Class for represent libycus ID's
 *
 * Copyright (c) 2000  Sean Redmond
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *
 * $Revision: 1.3 $
 * $Date: 2001/10/11 19:02:39 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSID_H_
#define _IBYCUSID_H_

#include <cassert>
#include <iostream>

#include <algorithm>
#include "IbycusCit.h"
#include "IbycusFile.h"
#include "IbycusIdNumber.h"
#include "IbycusException.h"
#include "IbycusParseException.h"

__IBYCUS_BEGIN_NAMESPACE
typedef map<ibychar_t, ibyIdNumber, less<ibychar_t> > IDMAP;

class IbycusId : private ibyCitation
{

public:
	IbycusId() : Flag_(NOFLAG) {};
	IbycusId(const IbycusId & rhs) : Flag_(rhs.Flag_), AuthDesc_(rhs.AuthDesc_),
		WorkDesc_(rhs.WorkDesc_),Ids_(rhs.Ids_) {};
	IbycusId(ibyFile & src) : Flag_(NOFLAG)
		{ Read(src, IbycusId()); };
	IbycusId(ibyFile & src, const IbycusId & prev) : Flag_(NOFLAG)
		{ Read(src, prev); };
	IbycusId(const IbycusId & rhs, const ibyIdNumber & cit1,
		const ibyIdNumber & cit2 = ibyIdNumber(),
		const ibyIdNumber & cit3 = ibyIdNumber(),
		const ibyIdNumber & cit4 = ibyIdNumber(),
		const ibyIdNumber & cit5 = ibyIdNumber());

	virtual ~IbycusId() {};


	bool IsTitle() const;
	enum comp_level { cl_auth, cl_work,	cl_sect	};
	enum format_flags {
		fmt_titles  = 0x00,
		fmt_numbers = 0x01,
		fmt_diff    = fmt_numbers << 1,
		fmt_auth    = fmt_diff    << 1,
		fmt_work    = fmt_auth    << 1,
		fmt_section = fmt_work    << 1,
		fmt_same    = fmt_section << 1
	};

	bool SameAs(const IbycusId & rhs, const comp_level & cl = cl_sect) const;
	void Clear();
	void Read(istream & src, const IbycusId & prev);
	IbycusId & operator=(const IbycusId & rhs);
	bool operator==(const IbycusId & rhs) const
		{ return Flag_ == rhs.Flag_ && Ids_ == rhs.Ids_; };
	bool operator!=(const IbycusId & rhs) const
		{ return Flag_ != rhs.Flag_ || Ids_ != rhs.Ids_; };
    bool operator<(const IbycusId & rhs) const
		{ return Ids_ < rhs.Ids_; };
    bool operator>(const IbycusId & rhs) const
		{ return Ids_ > rhs.Ids_; };
    bool operator<=(const IbycusId & rhs) const
		{ return ((Ids_ < rhs.Ids_) || (Ids_ == rhs.Ids_)); };
    bool operator>=(const IbycusId & rhs) const
		{ return ((Ids_ > rhs.Ids_) || (Ids_ == rhs.Ids_)); };
        int Flag() const{return Flag_;}

	ibystring_t Id(ibychar_t level) const;
	bool IsNull(const comp_level & cl = cl_sect) const;
	ibystring_t ToString(const int fmt = fmt_same,
		const IbycusId * prev = NULL) const;

	enum id_level {
		LV_A    = 0x00,
		LV_B    = 0x01,
		LV_C    = 0x02,
		LV_D	= 0x03,
		LN_Z	= 0x08,
		LN_Y	= 0x09,
		LN_X	= 0x0A,
		LN_W	= 0x0B,
		LN_V	= 0x0C,
		LN_N	= 0x0D,
		LN_ESC	= 0x0E,
		LN_SPEC	= 0x0F
	};

	enum id_flag {
		NOFLAG,
		ENDOFBLOCK,
		ENDOFFILE,
		EXCEPTION_START,
		EXCEPTION_END
	};

private:
	void insert(ibychar_t level, const ibyIdNumber & p_id);
	static format_flags Format_;

	int Flag_;
	ibyIdNumber AuthDesc_, WorkDesc_;
	IDMAP Ids_, Descrip_;

	enum rn_special {
		rn_eob		= 0xE,
		rn_eof		= 0x0,
		rn_ex_start	= 0x8,
		rn_ex_end	= 0x9
	};

friend ostream & operator<<(ostream & s, const IbycusId & rhs);
};


__IBYCUS_END_NAMESPACE

#endif	/* Not _IBYCUSID_H_ */
