/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "treecombobox.h"

CTreeComboBox::CTreeComboBox(QWidget *parent) :
    QComboBox(parent),newmenu(),lastadded(0),lfont(),uniq_id()
{

}

void CTreeComboBox::showPopup()
{
    if(lastadded)
    {
        newmenu.setMinimumWidth(width());
        QAction * a=newmenu.exec(mapToGlobal(QPoint(0,0)));
        if(a)
        {
            /*int ci(currentIndex()),ci2;
            QString os,os2;
            int oid(-1),oid2(-1);
            if(ci>=-1)
            {
                os=currentText();
                oid=itemData(ci).toInt();
            }*/
            setCurrentIndex(a->data().toInt());

            /*ci2=currentIndex();
            if(ci2>=-1)
            {
                os2=currentText();
                oid2=itemData(ci2).toInt();
            }
            if(os!=os2||oid!=oid2)
                emit contentChanged();*/
        }
    }
}

void CTreeComboBox::hidePopup()
{
    newmenu.close();
}

void CTreeComboBox::appendBranch(QString const & branch,QIcon const & icon)
{
    lastadded=newmenu.addMenu(icon,branch);
    lastadded->setFont(lfont);
    //menulist.append(branch);
}

void CTreeComboBox::appendItemToLastBranch(QString const & item,int uniq,const QVariant & userData,QIcon const & icon)
{

    if(lastadded)
    {
        addItem(icon,item,userData);
        uniq_id.append(uniq);
        QAction * a=lastadded->addAction(icon,item);
        a->setData((int)(count()-1));
    }
}

void CTreeComboBox::appendSingle(QString const & item,int uniq,const QVariant & userData)
{
    addItem(item,userData);
    uniq_id.append(uniq);
}

int CTreeComboBox::currentOrigId() const
{
    int ci(currentIndex());
    if(ci!=-1)
        return uniq_id[ci];

    return -1;
}

void CTreeComboBox::clear()
{
    QComboBox::clear();
    newmenu.clear();
    uniq_id.clear();
    lastadded=0;
}

void CTreeComboBox::setFont(QFont const & f)
{
    lfont=f;
    QComboBox::setFont(lfont);
    newmenu.setFont(lfont);
}

void CTreeComboBox::setOrigId(int uniq)
{
    if(uniq!=-1)
    {
        int i(uniq_id.indexOf(uniq));
        if(i!=-1)
            setCurrentIndex(i);
    }
}
